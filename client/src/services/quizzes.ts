import { apiRequest } from "./api";

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
  return apiRequest(`/quizzes/${quizId}/attempt`, "POST", payload) as Promise<{
    score: number;
  }>;
}
