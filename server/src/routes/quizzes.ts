import express from "express";
import prisma from "../prisma";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { callAI } from "../services/aiService";

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
router.get("/performance", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { callAI } = await import("../services/aiService");

    // Fetch all quiz attempts for the user with more details
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
          select: {
            id: true,
            questions: true,
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
        },
      },
      orderBy: { completedAt: "asc" },
    });

    if (attempts.length === 0) {
      return res.json({
        totalQuizzes: 0,
        averageScore: 0,
        bestSubject: "",
        weakestSubject: "",
        scoreOverTime: [],
        scoreBySubject: [],
        topicBreakdown: [],
        aiAnalysis: "",
        quizBreakdown: [],
        scoreDistribution: [],
      });
    }

    // Calculate basic stats
    const totalQuizzes = attempts.length;
    let totalScore = 0;
    const subjectScores: Record<string, { scores: number[]; totalQuizzes: number }> = {};
    const topicAnswers: Record<string, { correct: number; incorrect: number }> = {};
    const scoreDistribution = [0, 0, 0, 0, 0]; // 0-20%, 20-40%, 40-60%, 60-80%, 80-100%

    // Process all attempts and build quiz breakdown
    const quizBreakdownPromises = attempts.map(async (attempt) => {
      const subject = attempt.quiz.note?.subject?.name || "General";
      const noteTitle = attempt.quiz.note?.title || "Untitled Note";
      const questions = parseQuestions(attempt.quiz.questions);
      const totalQuestions = questions.length;

      // Track subject performance
      if (!subjectScores[subject]) {
        subjectScores[subject] = { scores: [], totalQuizzes: 0 };
      }
      subjectScores[subject].scores.push(attempt.score);
      subjectScores[subject].totalQuizzes += 1;

      totalScore += attempt.score;

      // Calculate percentage and update score distribution
      const percentage = Math.round((attempt.score / totalQuestions) * 100);
      const distributionIndex = Math.min(Math.floor(percentage / 20), 4);
      scoreDistribution[distributionIndex]++;

      // Track topic breakdown and find wrong topics
      const answers = Array.isArray(attempt.answers) ? attempt.answers : [];
      const wrongTopics: string[] = [];

      questions.forEach((question, index) => {
        if (!question || typeof question !== "object") return;

        const questionStr = String(question.question || "General");
        const isCorrect = Number(question.correctIndex) === Number(answers[index]);

        if (!topicAnswers[questionStr]) {
          topicAnswers[questionStr] = { correct: 0, incorrect: 0 };
        }

        if (isCorrect) {
          topicAnswers[questionStr].correct += 1;
        } else {
          topicAnswers[questionStr].incorrect += 1;
          wrongTopics.push(questionStr);
        }
      });

      // Generate AI insight for this quiz attempt
      let aiInsight = "";
      if (wrongTopics.length > 0) {
        try {
          const insightPrompt = `Analyze this quiz attempt. Subject: ${subject}.
Wrong answers were on these topics: ${wrongTopics.join(', ')}.
Score: ${attempt.score}/${totalQuestions}.
Give exactly 2 sentences: one identifying the weak concept, one giving a specific study tip.`;
          aiInsight = await callAI(insightPrompt);
        } catch (error) {
          console.error("AI Insight error:", error);
          aiInsight = "Unable to generate insight at this moment.";
        }
      }

      return {
        quizId: attempt.quiz.id,
        subject,
        noteTitle,
        score: attempt.score,
        totalQuestions,
        percentage,
        completedAt: attempt.completedAt.toISOString(),
        wrongTopics,
        aiInsight,
      };
    });

    const quizBreakdown = await Promise.all(quizBreakdownPromises);

    // Calculate average score
    const averageScore = Math.round((totalScore / (totalQuizzes * 5)) * 100);

    // Find best and weakest subjects
    const subjectAverages = Object.entries(subjectScores).map(([subject, data]) => ({
      subject,
      averageScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length / 5) * 100),
      totalQuizzes: data.totalQuizzes,
    }));

    const bestSubject =
      subjectAverages.length > 0
        ? subjectAverages.reduce((max, current) =>
            current.averageScore > max.averageScore ? current : max,
          ).subject
        : "";

    const weakestSubject =
      subjectAverages.length > 0
        ? subjectAverages.reduce((min, current) =>
            current.averageScore < min.averageScore ? current : min,
          ).subject
        : "";

    // Build score over time
    const scoreOverTime = attempts.map((attempt, index) => {
      const questions = parseQuestions(attempt.quiz.questions);
      const scorePercent = Math.round((attempt.score / Math.max(questions.length, 1)) * 100);
      return {
        date: new Date(attempt.completedAt).toISOString().split("T")[0],
        score: scorePercent,
      };
    });

    // Build topic breakdown (limit to top 10 topics)
    const topicBreakdown = Object.entries(topicAnswers)
      .slice(0, 10)
      .map(([topic, data]) => ({
        topic: topic.length > 50 ? topic.substring(0, 50) + "..." : topic,
        correct: data.correct,
        incorrect: data.incorrect,
      }));

    // Generate enhanced AI analysis
    const analysisData = {
      totalQuizzes,
      averageScore,
      bestSubject,
      weakestSubject,
      subjectBreakdown: subjectAverages,
      quizBreakdown,
    };

    const aiPrompt = `You are a precise study coach. Here is a student's complete quiz history broken down by subject and topic: ${JSON.stringify(analysisData)}.
Give a 4-5 sentence analysis covering:
1. Overall performance trend
2. Strongest subject and why
3. Weakest subject with specific weak topics
4. Concrete daily study recommendations
Be specific with topic names, not generic advice.`;

    let aiAnalysis = "";
    try {
      aiAnalysis = await callAI(aiPrompt);
    } catch (error) {
      console.error("AI Analysis error:", error);
      aiAnalysis = "Unable to generate AI analysis at this moment.";
    }

    // Format score distribution for frontend
    const scoreDistributionData = [
      { range: "0-20%", count: scoreDistribution[0] },
      { range: "20-40%", count: scoreDistribution[1] },
      { range: "40-60%", count: scoreDistribution[2] },
      { range: "60-80%", count: scoreDistribution[3] },
      { range: "80-100%", count: scoreDistribution[4] },
    ];

    res.json({
      totalQuizzes,
      averageScore,
      bestSubject,
      weakestSubject,
      scoreOverTime,
      scoreBySubject: subjectAverages,
      topicBreakdown,
      aiAnalysis,
      quizBreakdown,
      scoreDistribution: scoreDistributionData,
    });
  } catch (error) {
    console.error("FETCH PERFORMANCE ERROR:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});



router.get("/brain-fatigue", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { callAI } = await import("../services/aiService");

    // Fetch all quiz attempts for the user
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
      select: {
        score: true,
        completedAt: true,
        quiz: {
          select: {
            questions: true,
          },
        },
      },
    });

    if (attempts.length < 5) {
      return res.json({
        byHour: [],
        byDay: [],
        peakHour: 0,
        worstHour: 0,
        peakDay: "",
        worstDay: "",
        fatigueDropPercent: 0,
        aiInsight: "Take more quizzes at different times to unlock Brain Fatigue Analysis",
      });
    }

    // Group attempts by hour of day (0-23)
    const hourStats: Record<number, { scores: number[]; attempts: number }> = {};
    const dayStats: Record<string, { scores: number[]; attempts: number }> = {};

    // Initialize all hours and days
    for (let hour = 0; hour < 24; hour++) {
      hourStats[hour] = { scores: [], attempts: 0 };
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    dayNames.forEach(day => {
      dayStats[day] = { scores: [], attempts: 0 };
    });

    // Process all attempts
    attempts.forEach((attempt) => {
      const completedAt = new Date(attempt.completedAt);
      const hour = completedAt.getHours();
      const dayIndex = completedAt.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayName = dayNames[dayIndex];

      const questions = parseQuestions(attempt.quiz.questions);
      const scorePercent = questions.length > 0 ? (attempt.score / questions.length) * 100 : 0;

      // Add to hour stats
      hourStats[hour].scores.push(scorePercent);
      hourStats[hour].attempts++;

      // Add to day stats
      dayStats[dayName].scores.push(scorePercent);
      dayStats[dayName].attempts++;
    });

    // Calculate averages for hours
    const byHour = Object.entries(hourStats)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        averageScore: data.attempts > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.attempts)
          : 0,
        attempts: data.attempts,
      }))
      .sort((a, b) => a.hour - b.hour);

    // Calculate averages for days
    const byDay = Object.entries(dayStats)
      .map(([day, data]) => ({
        day,
        averageScore: data.attempts > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.attempts)
          : 0,
        attempts: data.attempts,
      }))
      .sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day));

    // Find peak and worst hours
    const validHours = byHour.filter(h => h.attempts > 0);
    const peakHour = validHours.length > 0
      ? validHours.reduce((max, current) => current.averageScore > max.averageScore ? current : max).hour
      : 0;
    const worstHour = validHours.length > 0
      ? validHours.reduce((min, current) => current.averageScore < min.averageScore ? current : min).hour
      : 0;

    // Find peak and worst days
    const validDays = byDay.filter(d => d.attempts > 0);
    const peakDay = validDays.length > 0
      ? validDays.reduce((max, current) => current.averageScore > max.averageScore ? current : max).day
      : "";
    const worstDay = validDays.length > 0
      ? validDays.reduce((min, current) => current.averageScore < min.averageScore ? current : min).day
      : "";

    // Calculate overall average and fatigue drop
    const allScores = attempts.map(attempt => {
      const questions = parseQuestions(attempt.quiz.questions);
      return questions.length > 0 ? (attempt.score / questions.length) * 100 : 0;
    });
    const overallAverage = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    const peakHourScore = byHour.find(h => h.hour === peakHour)?.averageScore || 0;
    const worstHourScore = byHour.find(h => h.hour === worstHour)?.averageScore || 0;
    const fatigueDropPercent = peakHourScore > 0
      ? Math.round(((peakHourScore - worstHourScore) / peakHourScore) * 100)
      : 0;

    // Generate AI insight
    const analysisData = {
      byHour: byHour.filter(h => h.attempts > 0),
      byDay: byDay.filter(d => d.attempts > 0),
      peakHour,
      worstHour,
      peakDay,
      worstDay,
      fatigueDropPercent,
      overallAverage: Math.round(overallAverage),
    };

    const aiPrompt = `You are a neuroscience-based study coach. Analyze this student's quiz performance patterns by time of day and day of week: ${JSON.stringify(analysisData)}.
Identify their peak performance window, when their brain fatigues, and give 3 specific actionable recommendations for WHEN to study which subjects.
Be specific with times and days. Maximum 4 sentences.`;

    let aiInsight = "";
    try {
      aiInsight = await callAI(aiPrompt);
    } catch (error) {
      console.error("AI Brain Fatigue Insight error:", error);
      aiInsight = "Unable to generate neuroscience insights at this moment.";
    }

    res.json({
      byHour,
      byDay,
      peakHour,
      worstHour,
      peakDay,
      worstDay,
      fatigueDropPercent,
      aiInsight,
    });
  } catch (error) {
    console.error("FETCH BRAIN FATIGUE ERROR:", error);
    res.status(500).json({ error: "Failed to fetch brain fatigue data" });
  }
});

router.get("/forgetting-curve", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Fetch all quiz attempts with quiz and subject info
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
          select: {
            id: true,
            questions: true,
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
        },
      },
      orderBy: { completedAt: "asc" },
    });

    if (attempts.length === 0) {
      return res.json({
        subjects: [],
        mostAtRisk: null,
        aiInsight: "No quiz attempts found. Start taking quizzes to track your forgetting curves!",
      });
    }

    // Group attempts by subject
    const subjectGroups: Record<string, typeof attempts> = {};
    attempts.forEach((attempt) => {
      const subjectName = attempt.quiz.note?.subject?.name || attempt.quiz.note?.title || "Unknown";
      if (!subjectGroups[subjectName]) {
        subjectGroups[subjectName] = [];
      }
      subjectGroups[subjectName].push(attempt);
    });

    const subjects = Object.entries(subjectGroups).map(([subject, subjectAttempts]) => {
      // Sort attempts by date
      subjectAttempts.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

      // Calculate scores as percentages
      const allAttempts = subjectAttempts.map((attempt) => {
        const questions = parseQuestions(attempt.quiz.questions);
        const totalQuestions = questions.length;
        const scorePercent = totalQuestions > 0 ? (attempt.score / totalQuestions) * 100 : 0;
        return {
          date: attempt.completedAt.toISOString().split('T')[0], // YYYY-MM-DD format
          score: Math.round(scorePercent),
        };
      });

      const latestAttempt = subjectAttempts[subjectAttempts.length - 1];
      const firstAttempt = subjectAttempts[0];

      const latestScore = allAttempts[allAttempts.length - 1].score;
      const firstScore = allAttempts[0].score;

      // Calculate days since last attempt
      const now = new Date();
      const daysSinceLastAttempt = Math.floor(
        (now.getTime() - latestAttempt.completedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate forgetting rate (drop per day)
      const daysBetween = Math.max(1, Math.floor(
        (latestAttempt.completedAt.getTime() - firstAttempt.completedAt.getTime()) / (1000 * 60 * 60 * 24)
      ));
      const forgettingRate = daysBetween > 1 ? (firstScore - latestScore) / daysBetween : 0;

      // Predictions
      const predictedScoreTomorrow = Math.max(0, latestScore - forgettingRate);
      const predictedScoreIn7Days = Math.max(0, latestScore - (forgettingRate * 7));

      // Determine status
      let status: "fresh" | "fading" | "critical" | "forgotten";
      if (daysSinceLastAttempt <= 3) status = "fresh";
      else if (daysSinceLastAttempt <= 7) status = "fading";
      else if (daysSinceLastAttempt <= 14) status = "critical";
      else status = "forgotten";

      return {
        subject,
        latestScore,
        daysSinceLastAttempt,
        forgettingRate: Math.round(forgettingRate * 100) / 100, // Round to 2 decimal places
        predictedScoreTomorrow: Math.round(predictedScoreTomorrow),
        predictedScoreIn7Days: Math.round(predictedScoreIn7Days),
        status,
        allAttempts,
      };
    });

    // Find most at risk subject
    const mostAtRisk = subjects.reduce((riskiest, current) => {
      if (!riskiest) return current;
      const riskLevels = { fresh: 0, fading: 1, critical: 2, forgotten: 3 };
      if (riskLevels[current.status] > riskLevels[riskiest.status]) return current;
      if (riskLevels[current.status] === riskLevels[riskiest.status]) {
        return current.forgettingRate > riskiest.forgettingRate ? current : riskiest;
      }
      return riskiest;
    }, null as typeof subjects[0] | null)?.subject || null;

    // Generate AI insight
    const subjectData = subjects.map(s => ({
      subject: s.subject,
      latestScore: s.latestScore,
      daysSinceLastAttempt: s.daysSinceLastAttempt,
      forgettingRate: s.forgettingRate,
      status: s.status,
    }));

    const aiPrompt = `You are a memory science expert. Analyze this student's forgetting curves per subject: ${JSON.stringify(subjectData)}.
Identify which subjects they forget fastest, which they retain best, and give a specific spaced repetition schedule recommendation.
Tell them exactly which subject to review today and why. Maximum 4 sentences. Be specific with subject names and days.`;

    let aiInsight = "";
    try {
      aiInsight = await callAI(aiPrompt);
    } catch (error) {
      console.error("AI Forgetting Curve Insight error:", error);
      aiInsight = "Unable to generate memory insights at this moment.";
    }

    res.json({
      subjects,
      mostAtRisk,
      aiInsight,
    });
  } catch (error) {
    console.error("FETCH FORGETTING CURVE ERROR:", error);
    res.status(500).json({ error: "Failed to fetch forgetting curve data" });
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
