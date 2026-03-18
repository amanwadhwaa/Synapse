import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

function trimText(text: string, maxChars = 4000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

function cleanOCR(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[|_=]{2,}/g, "")
    .trim();
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

async function callAI(prompt: string) {
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0].message.content || "No response";
}

export async function simplifyText(text: string) {
  const cleaned = cleanOCR(trimText(text));

  const prompt = `
  The following text was extracted from an image and may contain formatting errors.
You are an expert tutor helping a student understand difficult study notes.

Rewrite the following notes in simpler language.

Instructions:
- Keep the key technical terms.
- Explain concepts clearly and briefly.
- Use bullet points.
- Break long ideas into short sentences.
- Do not remove important information.

Notes:
${cleaned}
`;

  return callAI(prompt);
}

export async function summarizeText(text: string) {
  const cleaned = cleanOCR(trimText(text));

  const prompt = `
  The following text was extracted from an image and may contain formatting errors.
You are summarizing study notes for exam revision.

Extract the most important concepts.

Rules:
- Maximum 6 bullet points
- Each bullet must be under 20 words
- Focus only on key ideas
- Avoid repeating similar points

Notes:
${cleaned}
`;

  return callAI(prompt);
}

export async function generateQuiz(text: string) {
  const cleaned = cleanOCR(trimText(text));

  const prompt = `
  The following text was extracted from an image and may contain formatting errors.
You are a university professor creating a quiz from study notes.

Create 5 multiple choice questions.

Rules:
- Questions must test understanding, not memorization
- Each question must have four options
- Only one correct answer
- Do not make all answers option A

Format exactly:

Question 1:
A)
B)
C)
D)
Answer:

Notes:
${cleaned}
`;

  return callAI(prompt);
}

function normalizeGeneratedQuestions(
  rawQuestions: unknown,
): GeneratedQuizQuestion[] {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const maybeQuestion = item as {
        question?: unknown;
        options?: unknown;
        correctIndex?: unknown;
        explanation?: unknown;
      };

      if (
        typeof maybeQuestion.question !== "string" ||
        !Array.isArray(maybeQuestion.options) ||
        maybeQuestion.options.length !== 4 ||
        typeof maybeQuestion.explanation !== "string"
      ) {
        return null;
      }

      const options = maybeQuestion.options.map((option) =>
        typeof option === "string" ? option.trim() : "",
      );
      const correctIndex = Number(maybeQuestion.correctIndex);

      if (
        options.some((option) => !option) ||
        Number.isNaN(correctIndex) ||
        correctIndex < 0 ||
        correctIndex > 3
      ) {
        return null;
      }

      return {
        question: maybeQuestion.question.trim(),
        options,
        correctIndex,
        explanation: maybeQuestion.explanation.trim(),
      };
    })
    .filter((q): q is GeneratedQuizQuestion => q !== null)
    .slice(0, 5);
}

function extractJsonArray(text: string): unknown {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text;

  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generateQuizQuestions(
  text: string,
): Promise<GeneratedQuizQuestion[]> {
  const cleaned = cleanOCR(trimText(text, 7000));

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are an expert educator who creates high-quality multiple-choice quizzes.",
      },
      {
        role: "user",
        content: `Create exactly 5 multiple-choice questions from the notes below.

Return ONLY valid JSON as an array with this exact schema:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctIndex": 0,
    "explanation": "string"
  }
]

Rules:
- Exactly 4 options per question
- correctIndex must be 0, 1, 2, or 3
- Questions should test understanding
- Keep explanations concise and clear
- Do not include markdown, prose, or extra keys

Notes:
${cleaned}`,
      },
    ],
  });

  const responseText = completion.choices[0].message.content || "[]";
  let parsed: unknown = [];

  try {
    parsed = extractJsonArray(responseText);
  } catch {
    parsed = [];
  }

  const normalized = normalizeGeneratedQuestions(parsed);

  if (normalized.length < 5) {
    throw new Error("Model returned invalid quiz format");
  }

  return normalized;
}

export async function chatWithNotes(
  noteContent: string,
  message: string,
  conversationHistory: ChatMessage[],
) {
  const sanitizedNote = cleanOCR(trimText(noteContent, 7000));
  const sanitizedMessage = message.trim();

  const historyMessages = conversationHistory
    .filter((entry) => entry.content && entry.content.trim())
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }));

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a helpful study assistant. The student is studying the following notes: ${sanitizedNote}. Answer their questions clearly and helpfully based on these notes and your knowledge.`,
      },
      ...historyMessages,
      {
        role: "user",
        content: sanitizedMessage,
      },
    ],
  });

  return completion.choices[0].message.content || "I could not generate a response.";
}
