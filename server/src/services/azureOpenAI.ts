import OpenAI from "openai";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const apiKey = process.env.AZURE_OPENAI_KEY;

if (!endpoint || !deployment || !apiKey) {
  throw new Error(
    "Missing Azure OpenAI configuration. Ensure AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT, and AZURE_OPENAI_KEY are set.",
  );
}

const normalizedEndpoint = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;

export const azureOpenAIClient = new OpenAI({
  apiKey,
  baseURL: `${normalizedEndpoint}openai/deployments/${deployment}`,
  defaultQuery: { "api-version": "2024-02-01" },
  defaultHeaders: { "api-key": apiKey },
});

export const azureOpenAIModel = deployment;