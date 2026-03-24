import express from "express";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { chatWithNotes } from "../services/aiService";
import type { ChatMessage as AIChatMessage } from "../services/aiService";
import {
  getPreferredLanguage,
  normalizePreferredLanguage,
  buildPreferredLanguageInstruction,
} from "../services/preferredLanguage";
import { azureOpenAIClient, azureOpenAIModel } from "../services/azureOpenAI";
import { moderateContent, logModerationRejection } from "../services/contentModeration";

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

    // Moderate user message before processing
    const messageText = message.trim();
    const moderationResult = await moderateContent(messageText);
    if (!moderationResult.safe) {
      logModerationRejection(req.user!.id, moderationResult.category, messageText);
      return res.status(400).json({
        error: "CONTENT_REJECTED",
        message:
          "I'm sorry, I can't help with that. I'm here to help you study and learn — let's keep our conversation educational! 📚",
      });
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

router.post("/global", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { message, conversationHistory } = req.body as {
      message?: string;
      conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const messageText = message.trim();

    // Moderate user message before processing
    const moderationResult = await moderateContent(messageText);
    if (!moderationResult.safe) {
      logModerationRejection(req.user!.id, moderationResult.category, messageText);
      return res.status(400).json({
        error: "CONTENT_REJECTED",
        message:
          "I'm sorry, I can't help with that. I'm here to help you study and learn — let's keep our conversation educational! 📚",
      });
    }

    const userId = req.user!.id;
    const preferredLanguage = await getPreferredLanguage(userId);
    const resolvedLanguage = normalizePreferredLanguage(preferredLanguage);
    const languageInstruction = buildPreferredLanguageInstruction(resolvedLanguage);

    const historyMessages = (conversationHistory || [])
      .filter((entry) => entry.content && entry.content.trim())
      .map((entry) => ({
        role: entry.role,
        content: entry.content.trim(),
      }));

    const systemPrompt = `You are SYNAPSE Assistant, a helpful AI built into the SYNAPSE study app.
You have two areas of expertise:

1. SYNAPSE APP KNOWLEDGE:
SYNAPSE is an AI-powered study buddy app with these features:
- Notes: Create typed notes, upload images/PDFs/PPTs for AI analysis, voice recording with transcription and translation
- Note Detail: Simplify, Summarize, Generate Quiz, Audio Lecture (AI tutor reads notes aloud), Ask SYNAPSE chatbot (note-specific)
- Dashboard: Study activity heatmap, performance overview, FAB quick actions
- Study Planner: Plan and organize study sessions
- Quizzes: AI-generated quizzes from notes, performance tracking
- Performance: AI Study Coach Analysis, Score Trend, Subject Performance, Brain Fatigue Detector, Forgetting Curve
- Profile: Preferred language setting (affects all AI outputs), account settings
- Pomodoro Timer: Floating timer with subject selector, persists across pages
- Global Assistant: That's you! Available on every page

2. GENERAL STUDY HELP:
You can answer general academic questions, explain concepts, suggest study techniques, help with time management, and provide learning strategies.

Always be encouraging, clear and concise. If asked about something outside these two areas, politely redirect to what you can help with.`;

    const completion = await azureOpenAIClient.chat.completions.create({
      model: azureOpenAIModel,
      messages: [
        {
          role: "system",
          content: `${languageInstruction}\n\n${systemPrompt}`,
        },
        ...historyMessages,
        {
          role: "user",
          content: message.trim(),
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content || "I could not generate a response.";

    return res.json({ reply });
  } catch (error) {
    console.error("GLOBAL CHAT ERROR:", error);
    return res.status(500).json({ error: "Failed to process global chat message" });
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
