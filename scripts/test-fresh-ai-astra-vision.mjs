import assert from "node:assert/strict";
import { analyzeAstraImage, getAstraVisionReadiness } from "../src/core/fresh-ai/astra/AstraVisionEngine.ts";

const env = process.env;
env.FRESH_AI_VISION_ENGINE_URL = "https://vision.fresh.example/v1/analyze";
env.FRESH_AI_VISION_ENGINE_TOKEN = "test-server-token";
assert.equal(getAstraVisionReadiness().status, "configured-not-verified");

const originalFetch = globalThis.fetch;
let captured: { url: string; init: RequestInit } | null = null;
globalThis.fetch = async (url, init) => {
  captured = { url: String(url), init: init ?? {} };
  return new Response(JSON.stringify({
    contract: "fresh-vision-v1",
    modelId: "fresh-unified-1",
    checkpointId: "fresh-vision-checkpoint-test",
    engineVersion: "0.1.0-test",
    summary: "A test scene containing one object.",
    entities: [{ id: "entity-1", label: "test object", confidence: 0.98 }],
    uncertainty: ["This is a mocked integration response, not a live model result."],
  }), { status: 200, headers: { "content-type": "application/json" } });
};

const observation = {
  id: "vision-observation-1",
  modality: "image" as const,
  capturedAt: new Date().toISOString(),
  source: "user-upload" as const,
  consentGranted: true,
  payloadRef: "uploads/user-1/image-1",
};
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

try {
  const result = await analyzeAstraImage({
    userId: "user-1",
    observation,
    imageBytes: png,
    mimeType: "image/png",
  });
  assert.equal(result.modelId, "fresh-unified-1");
  assert.equal(result.checkpointId, "fresh-vision-checkpoint-test");
  assert.equal(result.worldState.entities.length, 1);
  assert.equal(result.worldState.observations[0].id, observation.id);
  assert.equal(result.provenance.contract, "fresh-vision-v1");
  assert.ok(captured);
  assert.equal(captured.url, "https://vision.fresh.example/v1/analyze");
  assert.equal((captured.init.headers as Record<string, string>).authorization, "Bearer test-server-token");
  assert.equal(captured.init.redirect, "error");
  const sent = JSON.parse(String(captured.init.body));
  assert.equal(sent.contract, "fresh-vision-v1");
  assert.equal(sent.modelId, "fresh-unified-1");

  await assert.rejects(
    () => analyzeAstraImage({ userId: "user-1", observation: { ...observation, consentGranted: false }, imageBytes: png, mimeType: "image/png" }),
    /consent/i,
  );
  await assert.rejects(
    () => analyzeAstraImage({ userId: "user-1", observation, imageBytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" }),
    /match the declared image type/i,
  );
  await assert.rejects(
    () => analyzeAstraImage({ userId: "", observation, imageBytes: png, mimeType: "image/png" }),
    /signed-in Fresh ID/i,
  );
  await assert.rejects(
    () => analyzeAstraImage({ userId: "user-1", observation, imageBytes: png, mimeType: "image/svg+xml" }),
    /supports PNG/i,
  );

  globalThis.fetch = async () => new Response(JSON.stringify({
    contract: "fresh-vision-v1", modelId: "fresh-unified-1", checkpointId: "x", engineVersion: "x",
    summary: "invalid entity", entities: [{ id: "bad", label: "bad", confidence: 2 }], uncertainty: [],
  }), { status: 200, headers: { "content-type": "application/json" } });
  await assert.rejects(
    () => analyzeAstraImage({ userId: "user-1", observation, imageBytes: png, mimeType: "image/png" }),
    /invalid fields/i,
  );

  console.log("Astra vision adapter passed: authenticated caller, consent, MIME/signature, Fresh model identity, server token, provenance and response validation.");
} finally {
  globalThis.fetch = originalFetch;
}
