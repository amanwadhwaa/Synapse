import express from "express";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import prisma from "../prisma";
import type { Prisma } from "../generated";
import {
  simplifyText,
  summarizeText,
  generateQuizQuestions,
  chatWithNotes,
  speakText,
  ChatMessage,
} from "../services/aiService";
import { getPreferredLanguage } from "../services/preferredLanguage";
import { moderateContent, logModerationRejection } from "../services/contentModeration";

const router = express.Router();

router.post("/simplify", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, level } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content required" });
    }

    const preferredLanguage = await getPreferredLanguage(req.user!.id);
    const result = await simplifyText(content, level || 3, preferredLanguage);

    res.json({ result });
  } catch (error) {
    console.error("SIMPLIFY ERROR:", error);
    res.status(500).json({ error: "Failed to simplify content" });
  }
});

router.post("/summarize", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, level } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content required" });
    }

    const preferredLanguage = await getPreferredLanguage(req.user!.id);
    const result = await summarizeText(content, level || 3, preferredLanguage);

    res.json({ result });
  } catch (error) {
    console.error("SUMMARIZE ERROR:", error);
    res.status(500).json({ error: "Failed to summarize content" });
  }
});

router.post("/generate-quiz", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { noteId, content, level } = req.body as {
      noteId?: string;
      content?: string;
      level?: number;
    };

    if (!noteId) {
      return res.status(400).json({ error: "noteId required" });
    }

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: req.user!.id,
      },
      select: {
        id: true,
        subjectId: true,
        rawText: true,
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const contentToProcess = content || note.rawText;

    // Moderate the content before generating quiz
    const moderationResult = await moderateContent(contentToProcess);
    if (!moderationResult.safe) {
      logModerationRejection(req.user!.id, moderationResult.category, contentToProcess);
      return res.status(400).json({
        error: "CONTENT_REJECTED",
        message: "Unable to generate quiz from this content.",
      });
    }

    const preferredLanguage = await getPreferredLanguage(req.user!.id);
    const questions = await generateQuizQuestions(
      contentToProcess,
      level || 3,
      preferredLanguage,
    );

    const quiz = await prisma.quiz.create({
      data: {
        noteId: note.id,
        userId: req.user!.id,
        subjectId: note.subjectId || null,
        questions: questions as unknown as Prisma.InputJsonValue,
      },
    });

    res.json({ result: "Quiz generated", quizId: quiz.id, questions });
  } catch (error) {
    console.error("QUIZ ERROR:", error);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

router.post("/chat", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      noteId,
      message,
      conversationHistory,
    }: {
      noteId?: string;
      message?: string;
      conversationHistory?: ChatMessage[];
    } = req.body;

    if (!noteId || !message) {
      return res
        .status(400)
        .json({ error: "noteId and message are required" });
    }

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: req.user!.id,
      },
      select: {
        rawText: true,
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const preferredLanguage = await getPreferredLanguage(req.user!.id);
    const result = await chatWithNotes(
      note.rawText,
      message,
      Array.isArray(conversationHistory) ? conversationHistory : [],
      preferredLanguage,
    );

    res.json({ result });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
});

router.post("/speak", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content required" });
    }

    const preferredLanguage = await getPreferredLanguage(req.user!.id);
    const result = await speakText(content, preferredLanguage);

    res.json({ result });
  } catch (error) {
    console.error("SPEAK ERROR:", error);
    res.status(500).json({ error: "Failed to generate speech text" });
  }
});

export default router;
