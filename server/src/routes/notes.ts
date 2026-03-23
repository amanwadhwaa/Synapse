import express from "express";
import multer from "multer";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { extractNotesFromImageBase64 } from "../services/noteVision";
import {
  deleteAzureBlobByUrl,
  uploadBufferToAzureBlob,
} from "../services/fileStorage";
import { transcribeAudioBuffer } from "../services/speechToText";
import { getPreferredLanguage } from "../services/preferredLanguage";
import { azureOpenAIClient, azureOpenAIModel } from "../services/azureOpenAI";
const { PDFParse } = require("pdf-parse");

const NO_SPEECH_ERROR_MESSAGE =
  "No speech detected. Please ensure your microphone is working and try speaking clearly. Background noise may affect detection.";

const ENGLISH_CHECK_PROMPT =
  "Is the following text in English? Reply with only YES or NO.";

const TRANSLATE_TO_ENGLISH_SYSTEM_PROMPT =
  "You are a translator. Translate the following text to English accurately and naturally. Return only the translated text, nothing else.";

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
