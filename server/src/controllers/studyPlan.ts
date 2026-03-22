import { Request, Response } from "express";
import prisma from "../prisma";
import { azureOpenAIClient, azureOpenAIModel } from "../services/azureOpenAI";

type StudyPlanDay = {
  date: string;
  subjects: string[];
};

const normalizeStudyPlan = (value: unknown): StudyPlanDay[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const day = item as { date?: unknown; subjects?: unknown };
      if (typeof day.date !== "string" || !Array.isArray(day.subjects)) {
        return null;
      }

      const subjects = day.subjects.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
      if (!subjects.length) {
        return null;
      }

      return {
        date: day.date,
        subjects,
      };
    })
    .filter((d): d is StudyPlanDay => d !== null);
};

const extractJsonArray = (text: string): unknown => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return [];
  }

  return JSON.parse(candidate.slice(start, end + 1));
};

const buildFallbackStudyPlan = (exams: Array<{ subject: string; examDate: Date; difficulty: string }>) => {
  const today = new Date();

  const difficultyWeight: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  const tasks: Array<{ subject: string; sessions: number; priority: number; examDate: Date }> = [];

  for (const exam of exams) {
    const examDate = new Date(exam.examDate);

    const daysUntilExam = Math.ceil(
      (examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExam <= 0) continue;

    const weight = difficultyWeight[exam.difficulty.toLowerCase()] ?? 1;
    const sessions = weight * 3;
    const priority = weight / daysUntilExam;

    tasks.push({
      subject: exam.subject,
      sessions,
      priority,
      examDate,
    });
  }

  tasks.sort((a, b) => b.priority - a.priority);

  const lastExamDate = new Date(
    Math.max(...exams.map((e) => new Date(e.examDate).getTime())),
  );

  const calendar: Array<{ date: Date; sessions: string[] }> = [];
  const dateCursor = new Date(today);

  while (dateCursor <= lastExamDate) {
    calendar.push({
      date: new Date(dateCursor),
      sessions: [],
    });
    dateCursor.setDate(dateCursor.getDate() + 1);
  }

  const MAX_SESSIONS_PER_DAY = 2;

  for (const task of tasks) {
    let sessionsLeft = task.sessions;

    for (const day of calendar) {
      if (sessionsLeft === 0) break;
      if (day.date >= task.examDate) continue;
      if (day.sessions.length >= MAX_SESSIONS_PER_DAY) continue;

      day.sessions.push(task.subject);
      sessionsLeft--;
    }
  }

  return calendar
    .filter((day) => day.sessions.length > 0)
    .map((day) => ({
      date: day.date.toISOString().split("T")[0],
      subjects: day.sessions,
    }));
};

export const generateStudyPlan = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const exams = await prisma.exam.findMany({
      where: { userId },
      orderBy: { examDate: "asc" },
    });

    if (!exams.length) {
      return res.status(404).json({ message: "No exams found for this user" });
    }

    let studyPlan: StudyPlanDay[] = [];
    let generationMode: "azure-openai" | "fallback" = "azure-openai";

    try {
      const completion = await azureOpenAIClient.chat.completions.create({
        model: azureOpenAIModel,
        messages: [
          {
            role: "system",
            content:
              "You are an academic planning assistant. Build practical study schedules and return only valid JSON.",
          },
          {
            role: "user",
            content: `Create a day-by-day study plan from these exams. Return ONLY valid JSON with this schema:
[
  { "date": "YYYY-MM-DD", "subjects": ["Subject Name"] }
]

Rules:
- Start from today.
- Do not schedule sessions on or after an exam date for that exam.
- Prioritize earlier exam dates and harder subjects.
- Keep max 2 subjects per day.
- Include only days with at least one subject.

Exams:
${JSON.stringify(exams.map((exam) => ({
  subject: exam.subject,
  examDate: exam.examDate,
  difficulty: exam.difficulty,
})))}
`,
          },
        ],
      });

      const responseText = completion.choices[0].message.content || "[]";
      const parsed = extractJsonArray(responseText);
      studyPlan = normalizeStudyPlan(parsed);

      if (!studyPlan.length) {
        throw new Error("Model returned empty or invalid study plan");
      }
    } catch (aiError) {
      console.error("Study plan AI generation failed, using fallback:", aiError);
      studyPlan = buildFallbackStudyPlan(exams);
      generationMode = "fallback";
    }

    return res.status(200).json({
      message: "Study plan generated successfully",
      studyPlan,
      generationMode,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Error generating study plan",
    });
  }
};
