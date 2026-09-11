import fs from "node:fs";

const runtime = fs.readFileSync("src/core/fresh-ai/FreshNeuralGenerationRuntime.ts", "utf8");
const unified = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelCore.ts", "utf8");
const service = fs.readFileSync("src/core/fresh-ai/FreshAIServerServices.ts", "utf8");
const avatar = fs.readFileSync("api/ai/generate-avatar.ts", "utf8");

const required = [
  [runtime, "fresh-unified-1"],
  [runtime, "providerIndependent: true"],
  [runtime, "externalProviderRequired: false"],
  [runtime, "FRESH_UNIFIED_CHECKPOINT_ID"],
  [unified, 'weightsStatus: "training-required"'],
  [service, "generateFreshNeuralMedia"],
  [service, "provider-free image-generation"],
  [avatar, 'kind: "avatar"'],
  [avatar, 'model: result.modelId'],
];

for (const [text, token] of required) {
  if (!text.includes(token)) throw new Error(`Fresh neural generation gate failed: missing ${token}`);
}

if (/api\.openai\.com|OPENAI_API_KEY/.test(service)) throw new Error("Fresh image generation still contains an OpenAI dependency");
console.log("Fresh neural generation integrity: PASS");
