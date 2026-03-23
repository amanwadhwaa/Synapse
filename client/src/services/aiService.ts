import { apiRequest } from "./api";

export interface ChatMessagePayload {
  role: "user" | "assistant";
  content: string;
}

export interface PersistedChatMessage extends ChatMessagePayload {
  id: string;
  createdAt: string;
  noteId: string;
  userId: string;
}

export async function simplifyNote(noteId: string, content: string, level: number = 3) {
  return apiRequest("/ai/simplify", "POST", { noteId, content, level });
}

export async function summarizeNote(noteId: string, content: string, level: number = 3) {
  return apiRequest("/ai/summarize", "POST", { noteId, content, level });
}

export async function generateQuiz(noteId: string, content: string, level: number = 3) {
  return apiRequest("/ai/generate-quiz", "POST", { noteId, content, level });
}

export async function chatWithNote(
  noteId: string,
  message: string,
  preferredLanguage?: string,
) {
  return apiRequest(`/chat/${noteId}`, "POST", {
    message,
    preferredLanguage,
  });
}

export async function getChatHistory(noteId: string) {
  return apiRequest(`/chat/${noteId}`, "GET") as Promise<{
    messages: PersistedChatMessage[];
    preferredLanguage?: string;
  }>;
}

export async function clearChatHistory(noteId: string) {
  return apiRequest(`/chat/${noteId}`, "DELETE") as Promise<{ success: boolean }>;
}

export async function generateAudioLecture(
  noteId: string,
  forceRegenerate: boolean = false,
) {
  const token = localStorage.getItem("token");
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const response = await fetch(`${apiUrl}/notes/${noteId}/audio-lecture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ forceRegenerate }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate audio lecture");
  }

  return response.json() as Promise<{
    audioUrl: string;
    cached: boolean;
    lectureLanguage?: string;
    fallbackToEnglish?: boolean;
    fallbackNote?: string | null;
  }>;
}
