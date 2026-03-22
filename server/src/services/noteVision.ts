const NOTE_EXTRACTION_PROMPT =
  "You are a smart note extraction assistant. Analyze this image of study notes and extract ALL the content you can see. This includes:\n- All text (printed or handwritten)\n- Mathematical equations and formulas\n- Diagrams with labels\n- Tables and their data\n- Bullet points and lists\n- Any drawings with annotations\nFormat the output as clean, structured text that preserves the organization of the original notes. If there are diagrams, describe them clearly.";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const getAzureOpenAIConfig = () => {
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";

  if (!apiKey || !endpoint) {
    throw new Error("Azure OpenAI is not configured. Missing AZURE_OPENAI_KEY or AZURE_OPENAI_ENDPOINT.");
  }

  return {
    apiKey,
    endpoint: endpoint.replace(/\/+$/, ""),
    deployment,
  };
};

const extractMessageContent = (response: ChatCompletionResponse) => {
  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content.trim();
  }

  return content
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text?.trim() || "")
    .filter(Boolean)
    .join("\n")
    .trim();
};

export const extractNotesFromImageBase64 = async ({
  base64,
  mimeType,
}: {
  base64: string;
  mimeType: string;
}) => {
  const { apiKey, endpoint, deployment } = getAzureOpenAIConfig();
  const apiVersion = "2024-10-21";
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      model: deployment,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: NOTE_EXTRACTION_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Azure OpenAI request failed (${response.status}): ${responseText}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;

  if (payload.error?.message) {
    throw new Error(`Azure OpenAI error: ${payload.error.message}`);
  }

  return extractMessageContent(payload) || "No text could be extracted from this content.";
};