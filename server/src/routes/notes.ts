import express from "express";
import multer from "multer";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { extractNotesFromImageBase64 } from "../services/noteVision";
import { uploadBufferToAzureBlob } from "../services/fileStorage";
const { PDFParse } = require("pdf-parse");

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
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(notes);
  } catch (error) {
    console.error("FETCH NOTES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// UPLOAD PDF NOTE
router.post(
  "/upload-pdf",
  authMiddleware,
  pdfUpload.single("pdf"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file provided" });
      }

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
          title: originalName,
          rawText: extractedText,
          extractedText,
          sourceType: "PDF",
          fileUrl,
          originalFileName: originalName,
          pageCount,
        },
      });

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
