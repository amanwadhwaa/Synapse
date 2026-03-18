import express from "express";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";

interface StoredQuizQuestion {
  question?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
}

const parseQuestions = (raw: unknown): StoredQuizQuestion[] => {
  return Array.isArray(raw) ? (raw as StoredQuizQuestion[]) : [];
};

const router = express.Router();

router.get("/stats", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
          select: {
            questions: true,
          },
        },
      },
    });

    const completedCount = attempts.length;

    const percentages = attempts
      .map((attempt) => {
        const questions = parseQuestions(attempt.quiz.questions);
        if (questions.length === 0) return null;
        return (attempt.score / questions.length) * 100;
      })
      .filter((value): value is number => value !== null);

    const averageScore =
      percentages.length > 0
        ? Math.round(
            percentages.reduce((sum, value) => sum + value, 0) /
              percentages.length,
          )
        : 0;

    res.json({ completedCount, averageScore });
  } catch (error) {
    console.error("FETCH QUIZ STATS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch quiz stats" });
  }
});

router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const quizzes = await prisma.quiz.findMany({
      where: { userId },
      include: {
        note: {
          select: {
            title: true,
            subject: {
              select: {
                name: true,
              },
            },
          },
        },
        attempts: {
          where: { userId },
          select: { score: true, completedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const payload = quizzes.map((quiz) => {
      const questionCount = Array.isArray(quiz.questions)
        ? quiz.questions.length
        : 0;
      const bestScore =
        quiz.attempts.length > 0
          ? Math.max(...quiz.attempts.map((attempt) => attempt.score))
          : null;

      return {
        id: quiz.id,
        createdAt: quiz.createdAt,
        subjectName: quiz.note?.subject?.name || "General",
        noteTitle: quiz.note?.title || "Untitled Note",
        questionCount,
        bestScore,
      };
    });

    res.json(payload);
  } catch (error) {
    console.error("FETCH QUIZZES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});

router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: String(req.params.id),
        userId,
      },
      include: {
        note: {
          select: {
            title: true,
            subject: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json(quiz);
  } catch (error) {
    console.error("FETCH QUIZ ERROR:", error);
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
});

router.post("/:id/attempt", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const quizId = String(req.params.id);
    const { answers, score }: { answers?: number[]; score?: number } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "answers array is required" });
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        userId,
      },
      select: {
        id: true,
        questions: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const questions = parseQuestions(quiz.questions);

    const computedScore = questions.reduce((total, currentQuestion, index) => {
      if (!currentQuestion || typeof currentQuestion !== "object") {
        return total;
      }

      const isCorrect =
        Number(currentQuestion.correctIndex) === Number(answers[index]);

      return isCorrect ? total + 1 : total;
    }, 0);

    const finalScore =
      typeof score === "number" && score >= 0 ? Math.min(score, computedScore) : computedScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId,
        score: finalScore,
        answers,
      },
    });

    res.json({ attempt, score: finalScore });
  } catch (error) {
    console.error("SAVE ATTEMPT ERROR:", error);
    res.status(500).json({ error: "Failed to save attempt" });
  }
});

export default router;
