import { apiRequest } from "./api";
import { clearAllPerformanceCache } from "./performanceCache";

export interface QuizListItem {
  id: string;
  createdAt: string;
  subjectName: string;
  noteTitle: string;
  questionCount: number;
  bestScore: number | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizDetail {
  id: string;
  createdAt: string;
  note?: {
    title: string;
  };
  subject?: {
    name: string;
  };
  questions: QuizQuestion[];
}

export interface PerformanceData {
  totalQuizzes: number;
  averageScore: number;
  bestSubject: string;
  weakestSubject: string;
  scoreOverTime: { date: string; score: number }[];
  scoreBySubject: { subject: string; averageScore: number; totalQuizzes: number }[];
  topicBreakdown: { topic: string; correct: number; incorrect: number }[];
  aiAnalysis: string;
  quizBreakdown: QuizBreakdownItem[];
  scoreDistribution: { range: string; count: number }[];
}

export interface BrainFatigueData {
  byHour: { hour: number; averageScore: number; attempts: number }[];
  byDay: { day: string; averageScore: number; attempts: number }[];
  peakHour: number;
  worstHour: number;
  peakDay: string;
  worstDay: string;
  fatigueDropPercent: number;
  aiInsight?: string;
  aiInsights?: string;
  totalAttempts?: number;
}

const USE_BRAIN_FATIGUE_MOCK = import.meta.env.VITE_USE_BRAIN_FATIGUE_MOCK === "true";
const USE_FORGETTING_CURVE_MOCK = import.meta.env.VITE_USE_FORGETTING_CURVE_MOCK === "true";

const MOCK_BRAIN_FATIGUE_DATA: BrainFatigueData = {
  byHour: [
    { hour: 7, averageScore: 62, attempts: 2 },
    { hour: 9, averageScore: 86, attempts: 3 },
    { hour: 11, averageScore: 83, attempts: 2 },
    { hour: 14, averageScore: 71, attempts: 3 },
    { hour: 17, averageScore: 64, attempts: 2 },
    { hour: 21, averageScore: 58, attempts: 1 },
  ],
  byDay: [
    { day: "Sunday", averageScore: 68, attempts: 1 },
    { day: "Monday", averageScore: 82, attempts: 2 },
    { day: "Tuesday", averageScore: 85, attempts: 2 },
    { day: "Wednesday", averageScore: 80, attempts: 2 },
    { day: "Thursday", averageScore: 74, attempts: 2 },
    { day: "Friday", averageScore: 69, attempts: 2 },
    { day: "Saturday", averageScore: 63, attempts: 2 },
  ],
  peakHour: 9,
  worstHour: 21,
  peakDay: "Tuesday",
  worstDay: "Saturday",
  fatigueDropPercent: 33,
  totalAttempts: 13,
  aiInsight:
    "Your strongest deep-work window is 9:00 AM - 11:00 AM, especially on Tuesday and Wednesday. Reserve problem-solving subjects there and use 5:00 PM - 9:00 PM for revision and flashcards. Protect Friday evening and Saturday for low-load review because your scores dip most in those periods.",
};

const MOCK_FORGETTING_CURVE_DATA: ForgettingCurveData = {
  subjects: [
    {
      subject: "Mathematics",
      latestScore: 88,
      daysSinceLastAttempt: 2,
      forgettingRate: 5,
      predictedScoreTomorrow: 86,
      predictedScoreIn7Days: 79,
      status: "fresh",
      allAttempts: [
        { date: "2026-03-10", score: 74 },
        { date: "2026-03-16", score: 81 },
        { date: "2026-03-23", score: 88 },
      ],
    },
    {
      subject: "Physics",
      latestScore: 76,
      daysSinceLastAttempt: 6,
      forgettingRate: 8,
      predictedScoreTomorrow: 72,
      predictedScoreIn7Days: 60,
      status: "fading",
      allAttempts: [
        { date: "2026-03-08", score: 68 },
        { date: "2026-03-14", score: 73 },
        { date: "2026-03-19", score: 76 },
      ],
    },
    {
      subject: "Chemistry",
      latestScore: 69,
      daysSinceLastAttempt: 10,
      forgettingRate: 12,
      predictedScoreTomorrow: 63,
      predictedScoreIn7Days: 47,
      status: "critical",
      allAttempts: [
        { date: "2026-03-05", score: 72 },
        { date: "2026-03-11", score: 70 },
        { date: "2026-03-15", score: 69 },
      ],
    },
    {
      subject: "Biology",
      latestScore: 58,
      daysSinceLastAttempt: 16,
      forgettingRate: 15,
      predictedScoreTomorrow: 49,
      predictedScoreIn7Days: 32,
      status: "forgotten",
      allAttempts: [
        { date: "2026-02-22", score: 66 },
        { date: "2026-03-01", score: 62 },
        { date: "2026-03-09", score: 58 },
      ],
    },
  ],
  mostAtRisk: "Biology",
  aiInsight:
    "Biology is at highest risk and should be reviewed first with active recall today. Physics is fading, so schedule a short review block within 24 hours to prevent a steep drop. Mathematics remains stable; keep it on a lighter spaced-repetition cycle.",
};

export interface ForgettingCurveData {
  subjects: {
    subject: string;
    latestScore: number;
    daysSinceLastAttempt: number;
    forgettingRate: number;
    predictedScoreTomorrow: number;
    predictedScoreIn7Days: number;
    status: "fresh" | "fading" | "critical" | "forgotten";
    allAttempts: { date: string; score: number }[];
  }[];
  mostAtRisk: string | null;
  aiInsight: string;
}

export interface QuizBreakdownItem {
  quizId: string;
  subject: string;
  noteTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  wrongTopics: string[];
  aiInsight: string;
}

export async function fetchQuizzes() {
  return apiRequest("/quizzes") as Promise<QuizListItem[]>;
}

export async function fetchQuizById(quizId: string) {
  return apiRequest(`/quizzes/${quizId}`) as Promise<QuizDetail>;
}

export async function saveQuizAttempt(
  quizId: string,
  payload: { answers: number[]; score: number },
) {
  const result = (await apiRequest(`/quizzes/${quizId}/attempt`, "POST", payload)) as {
    score: number;
  };

  // Ensure analytics refresh after a newly completed quiz attempt.
  clearAllPerformanceCache();

  return result;
}

export async function fetchBrainFatigue() {
  if (USE_BRAIN_FATIGUE_MOCK) {
    return MOCK_BRAIN_FATIGUE_DATA;
  }

  const result = (await apiRequest("/quizzes/brain-fatigue")) as BrainFatigueData;

  // Older API responses might not include totalAttempts; infer it from chart rows.
  if (typeof result.totalAttempts !== "number") {
    const inferredAttempts = result.byHour.reduce((sum, row) => sum + (row.attempts || 0), 0);
    return { ...result, totalAttempts: inferredAttempts };
  }

  return result;
}

export async function fetchPerformance() {
  return apiRequest("/quizzes/performance") as Promise<PerformanceData>;
}

export async function fetchForgettingCurve() {
  if (USE_FORGETTING_CURVE_MOCK) {
    return MOCK_FORGETTING_CURVE_DATA;
  }

  return apiRequest("/quizzes/forgetting-curve") as Promise<ForgettingCurveData>;
}
