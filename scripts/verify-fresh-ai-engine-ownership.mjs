import fs from "node:fs";

const services = fs.readFileSync("src/core/fresh-ai/FreshAIServerServices.ts", "utf8");
const status = fs.readFileSync("src/server/freshAIStatus.ts", "utf8");
const model = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelCore.ts", "utf8");
const worker = fs.readFileSync("workers/media-worker/server.mjs", "utf8");

for (const token of [
  'owner: "Fresh AI"',
  'product: "Fresh Web Lite"',
  'nativeInferenceBackend: "not-installed"',
  'FRESH_AI_IMAGE_ENGINE_URL',
  'FRESH_AI_IMAGE_ENGINE_TOKEN',
  'FRESH_UNIFIED_CHECKPOINT_ID',
  'configured-not-verified',
  'configuration-required',
  'text-to-image model',
]) {
  if (!services.includes(token)) throw new Error(`Fresh-owned engine readiness missing: ${token}`);
}
if (!services.includes("no Fresh-managed image engine is configured") || !services.includes("No image was generated.")) throw new Error("Missing actionable image-engine-unavailable failure");
if (!status.includes("getFreshAIEngineReadiness()")) throw new Error("Fresh AI status does not expose safe engine readiness");
if (!model.includes('weightsStatus: "training-required"')) throw new Error("Fresh Unified model status must remain truthful");
if (!/service:\s*["']fresh-media-worker["']/.test(worker) || !/ffmpeg:\s*true/.test(worker)) throw new Error("Media worker identity check changed");
if (/process\.env\.(FRESH_AI_IMAGE_ENGINE_TOKEN|FRESH_MEDIA_WORKER_API_TOKEN)/.test(status)) {
  throw new Error("Public status must not read or expose engine secrets directly");
}
console.log("Fresh AI engine ownership/readiness contract: PASS");
