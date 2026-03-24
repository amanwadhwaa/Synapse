import express from "express";
import multer from "multer";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { extractNotesFromImageBase64 } from "../services/noteVision";
import {
  createBlobReadSasUrl,
  deleteAzureBlobByUrl,
  uploadBufferToAzureBlob,
} from "../services/fileStorage";
import { transcribeAudioBuffer } from "../services/speechToText";
import {
  getPreferredLanguage,
  normalizePreferredLanguage,
} from "../services/preferredLanguage";
import { azureOpenAIClient, azureOpenAIModel } from "../services/azureOpenAI";
import { moderateContent, logModerationRejection } from "../services/contentModeration";
const speechSdk = require("microsoft-cognitiveservices-speech-sdk");
const { PDFParse } = require("pdf-parse");

const NO_SPEECH_ERROR_MESSAGE =
  "No speech detected. Please ensure your microphone is working and try speaking clearly. Background noise may affect detection.";

const ENGLISH_CHECK_PROMPT =
  "Is the following text in English? Reply with only YES or NO.";

const TRANSLATE_TO_ENGLISH_SYSTEM_PROMPT =
  "You are a translator. Translate the following text to English accurately and naturally. Return only the translated text, nothing else.";

const TOPICS_PREREQUISITES_SYSTEM_PROMPT =
  "Analyze the following note content and return a JSON object with exactly this structure, no other text:\n{\n  relatedTopics: string[],      // 4-6 related topics the student could explore\n  prerequisites: string[]       // 3-5 concepts the student should know before studying this\n}\nKeep each item short (3-6 words max). Be specific to the actual content.";

const voiceMap: Record<string, string> = {
  English: "en-US-BrianNeural",
  Hindi: "hi-IN-MadhurNeural",
  Kannada: "kn-IN-GaganNeural",
  Tamil: "ta-IN-ValluvarNeural",
  Telugu: "te-IN-MohanNeural",
  French: "fr-FR-HenriNeural",
  Spanish: "es-ES-AlvaroNeural",
  German: "de-DE-ConradNeural",
  Japanese: "ja-JP-KeitaNeural",
  Chinese: "zh-CN-YunxiNeural",
  Arabic: "ar-SA-HamedNeural",
  Portuguese: "pt-BR-AntonioNeural",
};

const ENGLISH_FALLBACK_LANGUAGE = "English";
const ENGLISH_FALLBACK_VOICE = "en-US-BrianNeural";

const buildAudioLectureSystemPrompt = (preferredLanguage: string) =>
  `You are an enthusiastic and clear university tutor. Create an engaging spoken lecture script of approximately 5 minutes (700-800 words) based on the note content provided.
IMPORTANT: Deliver the entire lecture in ${preferredLanguage}.
If the note content is in a different language, translate and explain it naturally in ${preferredLanguage}.
Use a conversational tone, include real-world examples, natural pause cues, and end with a summary. No markdown or bullet points - only plain flowing speech.`;

async function isTextEnglish(text: string): Promise<boolean> {
  const completion = await azureOpenAIClient.chat.completions.create({
    model: azureOpenAIModel,
    messages: [
      {
        role: "user",
        content: `${ENGLISH_CHECK_PROMPT}\n\n${text}`,
      },
    ],
  });

  const answer = (completion.choices[0]?.message?.content || "").trim().toUpperCase();
  return answer === "YES";
}

async function translateTextToEnglish(text: string): Promise<string> {
  const completion = await azureOpenAIClient.chat.completions.create({
    model: azureOpenAIModel,
    messages: [
      {
        role: "system",
        content: TRANSLATE_TO_ENGLISH_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  return (completion.choices[0]?.message?.content || "").trim();
}

async function normalizeVoiceTextToEnglish(transcribedText: string): Promise<{
  textToSave: string;
  translatedToEnglish: boolean;
  translationFailed: boolean;
}> {
  const trimmedText = transcribedText.trim();
  if (!trimmedText) {
    return {
      textToSave: transcribedText,
      translatedToEnglish: false,
      translationFailed: false,
    };
  }

  let isEnglish = false;
  try {
    isEnglish = await isTextEnglish(trimmedText);
  } catch (error) {
    console.error("VOICE ENGLISH CHECK ERROR:", error);
    return {
      textToSave: transcribedText,
      translatedToEnglish: false,
      translationFailed: true,
    };
  }

  if (isEnglish) {
    return {
      textToSave: transcribedText,
      translatedToEnglish: false,
      translationFailed: false,
    };
  }

  try {
    const translatedText = await translateTextToEnglish(trimmedText);
    if (!translatedText) {
      return {
        textToSave: transcribedText,
        translatedToEnglish: false,
        translationFailed: true,
      };
    }

    return {
      textToSave: translatedText,
      translatedToEnglish: true,
      translationFailed: false,
    };
  } catch (error) {
    console.error("VOICE TRANSLATION ERROR:", error);
    return {
      textToSave: transcribedText,
      translatedToEnglish: false,
      translationFailed: true,
    };
  }
}

async function generateAudioLectureScript({
  noteContent,
  preferredLanguage,
}: {
  noteContent: string;
  preferredLanguage: string;
}): Promise<string> {
  const completion = await azureOpenAIClient.chat.completions.create({
    model: azureOpenAIModel,
    messages: [
      {
        role: "system",
        content: buildAudioLectureSystemPrompt(preferredLanguage),
      },
      {
        role: "user",
        content: noteContent,
      },
    ],
  });

  return (completion.choices[0]?.message?.content || "").trim();
}

function parseTopicsAndPrerequisites(rawContent: string): {
  relatedTopics: string[];
  prerequisites: string[];
} {
  const trimmed = rawContent.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(withoutFences) as {
    relatedTopics?: unknown;
    prerequisites?: unknown;
  };

  const relatedTopics = Array.isArray(parsed.relatedTopics)
    ? parsed.relatedTopics
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const prerequisites = Array.isArray(parsed.prerequisites)
    ? parsed.prerequisites
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (!relatedTopics.length || !prerequisites.length) {
    throw new Error("Invalid topics/prerequisites payload from model");
  }

  return {
    relatedTopics,
    prerequisites,
  };
}

function getVoiceForLanguage(preferredLanguage: string): string {
  return voiceMap[preferredLanguage] || ENGLISH_FALLBACK_VOICE;
}

async function synthesizeLectureAudioBuffer({
  script,
  voice,
}: {
  script: string;
  voice: string;
}): Promise<Buffer> {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    throw new Error("Azure Speech is not configured");
  }

  const speechConfig = speechSdk.SpeechConfig.fromSubscription(
    speechKey,
    speechRegion,
  );
  speechConfig.speechSynthesisVoiceName = voice;
  speechConfig.speechSynthesisOutputFormat =
    speechSdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  const synthesizer = new speechSdk.SpeechSynthesizer(speechConfig);

  try {
    const result = await new Promise<any>((resolve, reject) => {
      synthesizer.speakTextAsync(script, resolve, reject);
    });

    if (result.reason !== speechSdk.ResultReason.SynthesizingAudioCompleted) {
      const cancellationDetails = speechSdk.CancellationDetails.fromResult(result);
      throw new Error(
        cancellationDetails?.errorDetails || "Speech synthesis did not complete",
      );
    }

    const audioData = result.audioData as ArrayBuffer | Uint8Array | undefined;
    if (!audioData) {
      throw new Error("No audio data returned from speech synthesis");
    }

    return Buffer.from(
      audioData instanceof ArrayBuffer ? new Uint8Array(audioData) : audioData,
    );
  } finally {
    synthesizer.close();
  }
}

const convertPdfToPageImages = async (buffer: Buffer) => {
  const { pdf } = await import("pdf-to-img");
  const pdfDataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
  const document = await pdf(pdfDataUrl, { scale: 2.5 });
  const images: Array<{ pageNumber: number; base64: string; mimeType: string }> = [];

  let pageNumber = 1;
  for await (const image of document as AsyncIterable<Uint8Array | Buffer>) {
    const imageBuffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
    images.push({
      pageNumber,
      base64: imageBuffer.toString("base64"),
      mimeType: "image/png",
    });
    pageNumber += 1;
  }

  return images;
};

const extractPdfTextWithFallback = async (buffer: Buffer) => {
  // Use pdf-parse's public worker export so API and worker stay in lockstep.
  const { getPath } = require("pdf-parse/worker") as { getPath: () => string };
  PDFParse.setWorker(getPath());
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();
    return (data.text || "").trim();
  } finally {
    await parser.destroy();
  }
};

const router = express.Router();

const resolveSubjectId = async ({
  userId,
  subjectId,
  subjectName,
}: {
  userId: string;
  subjectId?: string;
  subjectName?: string;
}) => {
  if (subjectId && subjectId.trim()) {
    const existingSubject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingSubject) {
      throw new Error("Invalid subject selected");
    }

    return existingSubject.id;
  }

  const trimmedSubjectName = subjectName?.trim();
  if (trimmedSubjectName) {
    const existingByName = await prisma.subject.findFirst({
      where: {
        userId,
        name: trimmedSubjectName,
      },
      select: {
        id: true,
      },
    });

    if (existingByName) {
      return existingByName.id;
    }

    const createdSubject = await prisma.subject.create({
      data: {
        userId,
        name: trimmedSubjectName,
      },
      select: {
        id: true,
      },
    });

    return createdSubject.id;
  }

  return null;
};

const pdfUpload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
      return;
    }

    cb(new Error("Only PDF files are allowed"));
  },
});

const audioUpload = multer({
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only audio files are allowed"));
  },
});

// CREATE NOTE
router.post("/text", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, rawText, subjectId } = req.body;

    if (!rawText) {
      return res.status(400).json({ error: "Content required" });
    }

    // Moderate content before saving
    const moderationResult = await moderateContent(rawText);
    if (!moderationResult.safe) {
      logModerationRejection(req.user!.id, moderationResult.category, rawText);
      return res.status(400).json({
        error: "CONTENT_REJECTED",
        message:
          "SYNAPSE was unable to process this note as it contains content that violates our community guidelines.",
        category: moderationResult.category,
      });
    }

    const note = await prisma.note.create({
      data: {
        userId: req.user!.id,
        title: title || rawText.substring(0, 50),
        rawText,
        subjectId: subjectId || null,
        sourceType: "TYPED",
      },
      include: {
        subject: true,
      },
    });

    res.json(note);
  } catch (error) {
    console.error("CREATE NOTE ERROR:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// GET USER NOTES
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: {
        userId: req.user!.id,
      },
      include: {
        subject: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    console.log('GET /notes returning:', notes.map(n => ({ id: n.id, title: n.title, originalFileName: n.originalFileName, subjectId: n.subjectId })));

    res.json(notes);
  } catch (error) {
    console.error("FETCH NOTES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// GET DISTINCT SUBJECTS FROM USER'S NOTES
router.get("/subjects", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: {
        userId: req.user!.id,
        notes: {
          some: {
            userId: req.user!.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(subjects);
  } catch (error) {
    console.error("FETCH SUBJECTS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// UPLOAD PDF NOTE
router.post(
  "/voice-transcribe",
  authMiddleware,
  audioUpload.single("audio"),
  async (req: AuthRequest, res) => {
    let tempAudioUrl: string | null = null;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const mode = typeof req.body.mode === "string" ? req.body.mode : "";
      if (mode !== "new" && mode !== "append") {
        return res.status(400).json({ error: "Invalid mode" });
      }

      const userId = req.user!.id;
      const preferredLanguage = await getPreferredLanguage(userId);

      tempAudioUrl = await uploadBufferToAzureBlob({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype || "audio/webm",
        userId,
        originalFileName: req.file.originalname || "recording.webm",
        folder: "audios",
      });

      const transcribedText = await transcribeAudioBuffer({
        audioBuffer: req.file.buffer,
        preferredLanguage,
        mimeType: req.file.mimetype,
        originalFileName: req.file.originalname,
      });

      if (!transcribedText.trim()) {
        return res.status(400).json({ error: NO_SPEECH_ERROR_MESSAGE });
      }

      const {
        textToSave,
        translatedToEnglish,
        translationFailed,
      } = await normalizeVoiceTextToEnglish(transcribedText);

      // Moderate the transcribed content
      const moderationResult = await moderateContent(textToSave);
      if (!moderationResult.safe) {
        logModerationRejection(userId, moderationResult.category, textToSave);
        return res.status(400).json({
          error: "CONTENT_REJECTED",
          message:
            "SYNAPSE was unable to process this note as it contains content that violates our community guidelines.",
          category: moderationResult.category,
        });
      }

      if (mode === "append") {
        const noteId = typeof req.body.noteId === "string" ? req.body.noteId.trim() : "";
        if (!noteId) {
          return res.status(400).json({ error: "noteId is required for append mode" });
        }

        const existingNote = await prisma.note.findFirst({
          where: {
            id: noteId,
            userId,
          },
          select: {
            id: true,
            rawText: true,
            title: true,
            subject: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!existingNote) {
          return res.status(404).json({ error: "Target note not found" });
        }

        const separator = existingNote.rawText.trim()
          ? "\n\n--- Voice Addition ---\n\n"
          : "";

        const updated = await prisma.note.update({
          where: {
            id: existingNote.id,
          },
          data: {
            rawText: `${existingNote.rawText}${separator}${textToSave}`,
          },
          include: {
            subject: true,
          },
        });

        return res.json({
          noteId: updated.id,
          transcribedText: textToSave,
          title: updated.title,
          subject: updated.subject?.name || null,
          mode,
          translatedToEnglish,
          translationFailed,
        });
      }

      const incomingTitle = typeof req.body.title === "string" ? req.body.title.trim() : "";
      if (!incomingTitle) {
        return res.status(400).json({ error: "Title is required for new note mode" });
      }

      const resolvedSubjectId = await resolveSubjectId({
        userId,
        subjectId: typeof req.body.subjectId === "string" ? req.body.subjectId : undefined,
        subjectName:
          typeof req.body.subjectName === "string"
            ? req.body.subjectName
            : typeof req.body.subject === "string"
              ? req.body.subject
              : undefined,
      });

      const note = await prisma.note.create({
        data: {
          userId,
          title: incomingTitle,
          rawText: textToSave,
          extractedText: textToSave,
          sourceType: "VOICE",
          originalFileName: req.file.originalname || "voice-recording.webm",
          subjectId: resolvedSubjectId,
        },
        include: {
          subject: true,
        },
      });

      return res.json({
        noteId: note.id,
        transcribedText: textToSave,
        title: note.title,
        subject: note.subject?.name || null,
        mode,
        translatedToEnglish,
        translationFailed,
      });
    } catch (error) {
      console.error("VOICE TRANSCRIBE ERROR:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to transcribe recording";

      if (
        errorMessage.includes("No speech detected") ||
        errorMessage.includes("NoMatch")
      ) {
        return res.status(400).json({ error: NO_SPEECH_ERROR_MESSAGE });
      }

      return res.status(500).json({ error: errorMessage });
    } finally {
      if (tempAudioUrl) {
        try {
          await deleteAzureBlobByUrl(tempAudioUrl);
        } catch (cleanupError) {
          console.error("Failed to delete temporary audio blob:", cleanupError);
        }
      }
    }
  },
);

router.post(
  "/upload-pdf",
  authMiddleware,
  pdfUpload.single("pdf"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file provided" });
      }

      const incomingTitle = typeof req.body.title === "string" ? req.body.title.trim() : "";
      console.log('PDF upload - received title:', incomingTitle, 'raw body:', req.body);
      if (!incomingTitle) {
        return res.status(400).json({ error: "Title is required" });
      }

      const resolvedSubjectId = await resolveSubjectId({
        userId: req.user!.id,
        subjectId: typeof req.body.subjectId === "string" ? req.body.subjectId : undefined,
        subjectName: typeof req.body.subjectName === "string" ? req.body.subjectName : undefined,
      });

      const originalName = req.file.originalname || "Uploaded PDF";
      const fileUrl = await uploadBufferToAzureBlob({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype || "application/pdf",
        userId: req.user!.id,
        originalFileName: originalName,
        folder: "pdfs",
      });

      let extractedText = "";
      let extractionMode: "gpt-4o-vision" | "pdf-parse-fallback" = "gpt-4o-vision";
      let pageCount: number | null = null;

      try {
        const pageImages = await convertPdfToPageImages(req.file.buffer);
        pageCount = pageImages.length;

        if (!pageImages.length) {
          throw new Error("No pages could be extracted from this PDF");
        }

        const pageResults: string[] = [];

        for (const pageImage of pageImages) {
          const pageText = await extractNotesFromImageBase64({
            base64: pageImage.base64,
            mimeType: pageImage.mimeType,
          });

          pageResults.push(`Page ${pageImage.pageNumber}\n${pageText}`.trim());
        }

        extractedText = pageResults.join("\n\n").trim();
      } catch (visionError) {
        console.error("PDF vision extraction failed, using pdf-parse fallback:", visionError);
        extractedText = await extractPdfTextWithFallback(req.file.buffer);
        extractionMode = "pdf-parse-fallback";
      }

      if (!extractedText) {
        return res.status(400).json({ error: "No text could be extracted from this PDF" });
      }

      // Moderate the extracted PDF content
      const moderationResult = await moderateContent(extractedText);
      if (!moderationResult.safe) {
        logModerationRejection(req.user!.id, moderationResult.category, extractedText);
        // Delete the uploaded blob since we're rejecting it
        try {
          await deleteAzureBlobByUrl(fileUrl);
        } catch (deleteError) {
          console.error("Failed to delete rejected PDF blob:", deleteError);
        }
        return res.status(400).json({
          error: "CONTENT_REJECTED",
          message:
            "SYNAPSE was unable to process this PDF as it contains content that violates our community guidelines.",
          category: moderationResult.category,
        });
      }

      const note = await prisma.note.create({
        data: {
          userId: req.user!.id,
          title: incomingTitle,
          rawText: extractedText,
          extractedText,
          sourceType: "PDF",
          fileUrl,
          originalFileName: originalName,
          pageCount,
          subjectId: resolvedSubjectId,
        },
        include: {
          subject: true,
        },
      });
      
      console.log('Created PDF note:', { id: note.id, title: note.title, subjectId: note.subjectId, subject: note.subject });

      res.json({
        extractedText,
        extractionMode,
        note,
      });
    } catch (error) {
      console.error("UPLOAD PDF ERROR:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process PDF";
      res.status(500).json({ error: errorMessage });
    }
  },
);

router.post("/:id/audio-lecture", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const noteId = String(req.params.id || "");
    const forceRegenerate = Boolean(req.body?.forceRegenerate);
    const preferredLanguage = normalizePreferredLanguage(
      await getPreferredLanguage(req.user!.id),
    );

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: req.user!.id,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        rawText: true,
        audioLectureUrl: true,
        audioLectureLanguage: true,
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const isLanguageCacheMatch =
      note.audioLectureLanguage === preferredLanguage;

    if (note.audioLectureUrl && !forceRegenerate && isLanguageCacheMatch) {
      const hasSasToken = note.audioLectureUrl.includes("?");
      if (hasSasToken) {
        return res.json({
          audioUrl: note.audioLectureUrl,
          cached: true,
          lectureLanguage: note.audioLectureLanguage || preferredLanguage,
          fallbackToEnglish:
            (note.audioLectureLanguage || preferredLanguage) === ENGLISH_FALLBACK_LANGUAGE &&
            preferredLanguage !== ENGLISH_FALLBACK_LANGUAGE,
        });
      }

      const upgradedSasUrl = createBlobReadSasUrl({ blobUrl: note.audioLectureUrl });
      await prisma.note.update({
        where: {
          id: note.id,
        },
        data: {
          audioLectureUrl: upgradedSasUrl,
        },
      });

      return res.json({
        audioUrl: upgradedSasUrl,
        cached: true,
        lectureLanguage: note.audioLectureLanguage || preferredLanguage,
        fallbackToEnglish:
          (note.audioLectureLanguage || preferredLanguage) === ENGLISH_FALLBACK_LANGUAGE &&
          preferredLanguage !== ENGLISH_FALLBACK_LANGUAGE,
      });
    }

    const selectedVoice = getVoiceForLanguage(preferredLanguage);

    let lectureScript = "";
    let lectureLanguage = preferredLanguage;
    let fallbackToEnglish = false;
    let fallbackNote: string | null = null;
    try {
      lectureScript = await generateAudioLectureScript({
        noteContent: note.rawText,
        preferredLanguage,
      });
    } catch (error) {
      console.error("AUDIO LECTURE SCRIPT ERROR:", error);
      return res.status(500).json({
        error: "Failed to generate lecture script",
        stage: "script",
      });
    }

    if (!lectureScript.trim()) {
      return res.status(500).json({
        error: "Failed to generate lecture script",
        stage: "script",
      });
    }

    let audioBuffer: Buffer;
    try {
      audioBuffer = await synthesizeLectureAudioBuffer({
        script: lectureScript,
        voice: selectedVoice,
      });
    } catch (error) {
      console.error("AUDIO LECTURE TTS ERROR:", error);

      if (preferredLanguage === ENGLISH_FALLBACK_LANGUAGE) {
        return res.status(500).json({
          error: "Failed to convert script to audio",
          stage: "tts",
        });
      }

      fallbackToEnglish = true;
      fallbackNote =
        "Audio delivered in English (preferred language voice unavailable)";
      lectureLanguage = ENGLISH_FALLBACK_LANGUAGE;

      try {
        lectureScript = await generateAudioLectureScript({
          noteContent: note.rawText,
          preferredLanguage: ENGLISH_FALLBACK_LANGUAGE,
        });
      } catch {
        return res.status(500).json({
          error: "Failed to generate lecture script",
          stage: "script",
        });
      }

      if (!lectureScript.trim()) {
        return res.status(500).json({
          error: "Failed to generate lecture script",
          stage: "script",
        });
      }

      try {
        audioBuffer = await synthesizeLectureAudioBuffer({
          script: lectureScript,
          voice: ENGLISH_FALLBACK_VOICE,
        });
      } catch {
        return res.status(500).json({
          error: "Failed to convert script to audio",
          stage: "tts",
        });
      }
    }

    const rawAudioUrl = await uploadBufferToAzureBlob({
      buffer: audioBuffer,
      mimeType: "audio/mpeg",
      userId: note.userId,
      originalFileName: `${note.title || "lecture"}-audio-lecture.mp3`,
      folder: "audios",
    });

    const audioUrl = createBlobReadSasUrl({ blobUrl: rawAudioUrl });

    if (note.audioLectureUrl) {
      try {
        await deleteAzureBlobByUrl(note.audioLectureUrl);
      } catch (cleanupError) {
        console.error("AUDIO LECTURE OLD BLOB CLEANUP ERROR:", cleanupError);
      }
    }

    await prisma.note.update({
      where: {
        id: note.id,
      },
      data: {
        audioLectureUrl: audioUrl,
        audioLectureLanguage: lectureLanguage,
      },
    });

    return res.json({
      audioUrl,
      cached: false,
      lectureLanguage,
      fallbackToEnglish,
      fallbackNote,
    });
  } catch (error) {
    console.error("AUDIO LECTURE ERROR:", error);
    return res.status(500).json({ error: "Failed to generate audio lecture" });
  }
});

router.get("/:id/topics-prerequisites", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const noteId = String(req.params.id || "");
    const userId = req.user!.id;

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
      },
      select: {
        rawText: true,
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const preferredLanguage = normalizePreferredLanguage(
      await getPreferredLanguage(userId),
    );

    const completion = await azureOpenAIClient.chat.completions.create({
      model: azureOpenAIModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: TOPICS_PREREQUISITES_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Preferred language: ${preferredLanguage}.\n\nNote content:\n${note.rawText}`,
        },
      ],
    });

    const rawResponse = (completion.choices[0]?.message?.content || "").trim();
    const parsedResponse = parseTopicsAndPrerequisites(rawResponse);

    return res.json(parsedResponse);
  } catch (error) {
    console.error("FETCH NOTE TOPICS/PREREQUISITES ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch related topics and prerequisites" });
  }
});

// GET SINGLE NOTE
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const note = await prisma.note.findUnique({
      where: {
        id: req.params.id as string,
      },
      include: {
        subject: true,
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(note);
  } catch (error) {
    console.error("FETCH NOTE ERROR:", error);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// DELETE NOTE
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const noteId = req.params.id as string;

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: req.user!.id,
      },
      select: {
        id: true,
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    await prisma.$transaction(async (tx) => {
      const quizzes = await tx.quiz.findMany({
        where: {
          noteId,
          userId: req.user!.id,
        },
        select: {
          id: true,
        },
      });

      const quizIds = quizzes.map((quiz) => quiz.id);

      if (quizIds.length > 0) {
        await tx.quizAttempt.deleteMany({
          where: {
            quizId: {
              in: quizIds,
            },
            userId: req.user!.id,
          },
        });
      }

      await tx.quiz.deleteMany({
        where: {
          noteId,
          userId: req.user!.id,
        },
      });

      await tx.chatMessage.deleteMany({
        where: {
          noteId,
          userId: req.user!.id,
        },
      });

      await tx.note.delete({
        where: {
          id: noteId,
        },
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE NOTE ERROR:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
