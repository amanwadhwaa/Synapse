import { apiRequest } from "./api";

export interface ChatMessagePayload {
  role: "user" | "assistant";
  content: string;
}

export async function simplifyNote(noteId: string, content: string) {
  return apiRequest("/ai/simplify", "POST", { noteId, content });
}

export async function summarizeNote(noteId: string, content: string) {
  return apiRequest("/ai/summarize", "POST", { noteId, content });
}

export async function generateQuiz(noteId: string, content: string) {
  return apiRequest("/ai/generate-quiz", "POST", { noteId, content });
}

export async function chatWithNote(
  noteId: string,
  message: string,
  conversationHistory: ChatMessagePayload[],
) {
  return apiRequest("/ai/chat", "POST", {
    noteId,
    message,
    conversationHistory,
  });
}
