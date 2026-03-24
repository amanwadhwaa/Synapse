import { azureOpenAIClient, azureOpenAIModel } from "./azureOpenAI";

export type ModerationCategory =
  | "safe"
  | "harmful"
  | "violent"
  | "adult"
  | "hate"
  | "self_harm"
  | "illegal"
  | "academic_dishonesty"
  | "other";

export interface ModerationResult {
  safe: boolean;
  reason: string | null;
  category: ModerationCategory;
}

const CONTENT_MODERATION_SYSTEM_PROMPT = `You are a content moderation system for an educational study app used by students. Analyze the following content and return ONLY a JSON object with this exact structure:
{
  "safe": boolean,
  "reason": string | null,
  "category": "safe" | "harmful" | "violent" | "adult" | "hate" | "self_harm" | "illegal" | "academic_dishonesty" | "other"
}

Flag content that contains: violence, hate speech, adult content, self-harm, illegal activities, or content that promotes academic dishonesty (e.g., "write my entire assignment for me", "do my homework").

Educational content about sensitive historical events, medical topics, mature literature, or discussing challenging subjects in an academic context is generally SAFE.

Be strict but fair — this is a student learning platform. When in doubt, err on the side of caution.

Return ONLY the JSON object, no other text.`;

export async function moderateContent(text: string): Promise<ModerationResult> {
  const trimmedText = text.trim();

  // Skip moderation for empty text
  if (!trimmedText) {
    return {
      safe: false,
      reason: "Empty content provided",
      category: "other",
    };
  }

  try {
    const completion = await azureOpenAIClient.chat.completions.create({
      model: azureOpenAIModel,
      messages: [
        {
          role: "system",
          content: CONTENT_MODERATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Please moderate this content:\n\n${trimmedText}`,
        },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    const responseText = (completion.choices[0]?.message?.content || "").trim();

    // Try to parse the JSON response
    try {
      // Extract JSON if it's wrapped in code fence
      let jsonStr = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const result = JSON.parse(jsonStr) as ModerationResult;

      // Validate the result structure
      if (
        typeof result.safe === "boolean" &&
        (result.reason === null || typeof result.reason === "string") &&
        typeof result.category === "string"
      ) {
        return result;
      }
    } catch {
      // If JSON parsing fails, return error
      console.error("Failed to parse moderation response:", responseText);
    }

    // Default to unsafe if parsing fails
    return {
      safe: false,
      reason: "Content moderation system error",
      category: "other",
    };
  } catch (error) {
    console.error("Content moderation error:", error);
    // On error, be cautious and reject the content
    return {
      safe: false,
      reason: "Internal moderation service error",
      category: "other",
    };
  }
}

export function logModerationRejection(
  userId: string,
  category: ModerationCategory,
  flaggedContent: string
): void {
  const truncatedContent = flaggedContent.substring(0, 100);
  const timestamp = new Date().toISOString();

  console.warn(
    `[MODERATION REJECTION] ${timestamp} | userId: ${userId} | category: ${category} | content: ${truncatedContent}`
  );
}
