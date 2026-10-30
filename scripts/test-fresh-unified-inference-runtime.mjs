import assert from "node:assert/strict";
import { register } from "node:module";

// Server modules import siblings as "./x.js" (bundler style) while the source is x.ts; teach Node to resolve that.
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (/^\\.\\.?\\/.*\\.js$/.test(s)) return next(s.replace(/\\.js$/, ".ts"), c); throw e; } }`));

process.env.FRESH_UNIFIED_CHECKPOINT_ID = "fresh-unified-1-test-checkpoint";
process.env.FRESH_UNIFIED_INFERENCE_URL = "https://fresh-inference.internal";
process.env.FRESH_UNIFIED_INFERENCE_TOKEN = "test-server-token";
process.env.NODE_ENV = "production";

const { inferFreshUnified } = await import("../src/core/fresh-ai/FreshUnifiedModelInference.ts");
const originalFetch = globalThis.fetch;
let lastRequest;
const readyPayload = {
  modelId: "fresh-unified-1",
  checkpointId: "fresh-unified-1-test-checkpoint",
  modality: "text",
  status: "ready",
  text: "Fresh inference executed successfully.",
};

try {
  globalThis.fetch = async (url, options) => {
    lastRequest = { url: String(url), options };
    return new Response(JSON.stringify(readyPayload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const ready = await inferFreshUnified({ modality: "text", input: "Explain a test.", maxTokens: 2048 });
  assert.equal(ready.status, "ready");
  assert.equal(ready.text, readyPayload.text);
  assert.equal(lastRequest.options.redirect, "error", "inference must reject redirects");
  assert.equal(lastRequest.url, "https://fresh-inference.internal/v1/infer");
  const sent = JSON.parse(lastRequest.options.body);
  assert.equal(sent.maxTokens, 1024, "generation length must be bounded");

  globalThis.fetch = async () => new Response(JSON.stringify({ ...readyPayload, modelId: "untrusted-model" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  const wrongIdentity = await inferFreshUnified({ modality: "text", input: "test" });
  assert.equal(wrongIdentity.status, "training-required");

  globalThis.fetch = async () => new Response("not-json", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
  const wrongContentType = await inferFreshUnified({ modality: "text", input: "test" });
  assert.equal(wrongContentType.status, "training-required");

  globalThis.fetch = async () => new Response(JSON.stringify(readyPayload), {
    status: 200,
    headers: { "content-type": "application/json", "content-length": String(200 * 1024) },
  });
  const oversized = await inferFreshUnified({ modality: "text", input: "test" });
  assert.equal(oversized.status, "training-required");

  await assert.rejects(
    () => inferFreshUnified({ modality: "text", input: "x".repeat(32_001) }),
    /32,000-character limit/,
  );

  process.env.FRESH_UNIFIED_INFERENCE_URL = "https://user:password@fresh-inference.internal";
  const unsafeEndpoint = await inferFreshUnified({ modality: "text", input: "test" });
  assert.equal(unsafeEndpoint.status, "training-required");

  console.log("Fresh Unified inference runtime integration contract passed.");
} finally {
  globalThis.fetch = originalFetch;
}
