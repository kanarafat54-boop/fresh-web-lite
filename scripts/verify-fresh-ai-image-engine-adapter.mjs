import fs from "node:fs";

const services = fs.readFileSync("src/core/fresh-ai/FreshAIServerServices.ts", "utf8");
const ask = fs.readFileSync("api/ai/ask.ts", "utf8");
const runtime = fs.readFileSync("src/core/fresh-ai/FreshNeuralGenerationRuntime.ts", "utf8");

const required = [
  [services, 'FRESH_AI_IMAGE_ENGINE_URL', "optional image engine must be server-configured"],
  [services, 'FRESH_AI_IMAGE_ENGINE_TOKEN', "engine token must remain server-side"],
  [services, 'contract: "fresh-image-v1"', "adapter must use the Fresh-owned request contract"],
  [services, 'modelId: "fresh-unified-1"', "adapter must preserve Fresh model identity"],
  [services, 'AbortSignal.timeout(IMAGE_ENGINE_TIMEOUT_MS)', "external computation must have a timeout"],
  [services, 'redirect: "error"', "adapter must reject redirects"],
  [services, 'endpoint.protocol !== "https:"', "remote engine must require HTTPS"],
  [services, 'payload.b64Json.length > MAX_IMAGE_BASE64_CHARS', "image payload must be bounded"],
  [services, 'payload.mimeType !== "image/png"', "image output type must be validated"],
  [services, 'engine: "configured-image-engine"', "configured engine provenance must be exposed"],
  [services, 'engine: "fresh-native"', "native engine provenance must be exposed"],
  [ask, 'engine: "fresh-native" | "configured-image-engine"', "API result must type engine provenance"],
  [ask, 'metadata: { size: generatedImage.size, engine: generatedImage.engine }', "persisted assets must retain engine provenance"],
  [runtime, 'status: "training-required"', "native image generation must remain honest until trained inference exists"],
];

for (const [source, token, reason] of required) {
  if (!source.includes(token)) throw new Error(`Fresh AI image adapter contract failed: ${reason}`);
}
if (/api\.openai\.com|OPENAI_API_KEY/.test(services)) {
  throw new Error("Fresh AI core must not silently embed a provider-specific image dependency");
}
console.log("Fresh AI optional image engine adapter + provenance contract: PASS");
