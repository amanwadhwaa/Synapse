import prisma from "../prisma";

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function normalizePreferredLanguage(language?: string | null): string {
  if (!language || !language.trim()) {
    return "English";
  }

  return toTitleCase(language);
}

export async function getPreferredLanguage(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      language: true,
    },
  });

  return normalizePreferredLanguage(user?.language);
}

export function buildPreferredLanguageInstruction(preferredLanguage: string): string {
  const resolvedLanguage = normalizePreferredLanguage(preferredLanguage);

  return `The user's preferred language is ${resolvedLanguage}.\nYou MUST respond in ${resolvedLanguage}.\nHowever, if the content being discussed (such as an idiom, quote, or culturally specific term) is inherently in another language, you may include that original term or phrase, but your explanation, questions, and surrounding text must still be in ${resolvedLanguage}.`;
}

const azureSpeechLocaleMap: Record<string, string> = {
  english: "en-US",
  hindi: "hi-IN",
  kannada: "kn-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  bengali: "bn-IN",
  marathi: "mr-IN",
};

export function getAzureSpeechLocale(preferredLanguage?: string | null): string {
  const normalized = normalizePreferredLanguage(preferredLanguage).toLowerCase();
  return azureSpeechLocaleMap[normalized] || "en-US";
}
