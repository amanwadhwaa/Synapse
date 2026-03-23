import express from "express";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { chatWithNotes } from "../services/aiService";
import type { ChatMessage as AIChatMessage } from "../services/aiService";
import {
  getPreferredLanguage,
  normalizePreferredLanguage,
} from "../services/preferredLanguage";

const router = express.Router();

router.get("/:noteId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const noteId = String(req.params.noteId || "");

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: req.user!.id,
      },
      select: { id: true },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const preferredLanguage = await getPreferredLanguage(req.user!.id);

    const messages = await prisma.chatMessage.findMany({
      where: {
        noteId,
        userId: req.user!.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.json({ messages, preferredLanguage });
  } catch (error) {
    console.error("FETCH CHAT HISTORY ERROR:", error);
    return res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

router.post("/:noteId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const noteId = String(req.params.noteId || "");
    const { message, preferredLanguage } = req.body as {
      message?: string;
      preferredLanguage?: string;
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: req.user!.id,
      },
      select: {
        id: true,
        rawText: true,
      },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    const userMessage = await prisma.chatMessage.create({
      data: {
        noteId,
        userId: req.user!.id,
        role: "user",
        content: message.trim(),
      },
    });

    const historyRows = await prisma.chatMessage.findMany({
      where: {
        noteId,
        userId: req.user!.id,
        id: {
          not: userMessage.id,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        role: true,
        content: true,
      },
    });

    const conversationHistory: AIChatMessage[] = historyRows
      .filter(
        (entry): entry is typeof entry & { role: "user" | "assistant" } =>
          entry.role === "user" || entry.role === "assistant",
      )
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

    const resolvedPreferredLanguage = preferredLanguage?.trim()
      ? normalizePreferredLanguage(preferredLanguage)
      : await getPreferredLanguage(req.user!.id);

    const assistantResponse = await chatWithNotes(
      note.rawText,
      message.trim(),
      conversationHistory,
      resolvedPreferredLanguage,
    );

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        noteId,
        userId: req.user!.id,
        role: "assistant",
        content: assistantResponse,
      },
    });

    return res.json({
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    console.error("CHAT MESSAGE ERROR:", error);
    return res.status(500).json({ error: "Failed to process chat message" });
  }
});

router.delete("/:noteId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const noteId = String(req.params.noteId || "");

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: req.user!.id,
      },
      select: { id: true },
    });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    await prisma.chatMessage.deleteMany({
      where: {
        noteId,
        userId: req.user!.id,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("CLEAR CHAT ERROR:", error);
    return res.status(500).json({ error: "Failed to clear chat history" });
  }
});

export default router;
