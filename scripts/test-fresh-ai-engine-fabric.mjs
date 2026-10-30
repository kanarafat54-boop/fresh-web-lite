import assert from "node:assert/strict";
import {
  getFreshAIEngineInventory,
  executeFreshAIEngineJob,
} from "../src/core/fresh-ai/FreshAIEngineFabric.ts";

const empty = getFreshAIEngineInventory();
const find = (inventory, id) => inventory.find((engine) => engine.id === id);
assert.equal(find(empty, "fresh-unified").state, "evaluation-required");
assert.equal(find(empty, "video-generation").state, "configuration-required");
assert.equal(find(empty, "simulation").state, "simulation-only");
assert.equal(find(empty, "robotics").state, "blocked");
assert.equal(find(empty, "robotics").physicalActuation, false);

const configured = getFreshAIEngineInventory({
  FRESH_UNIFIED_CHECKPOINT_ID: "fresh-unified-1-run3",
  FRESH_UNIFIED_INFERENCE_URL: "https://fresh.example/infer",
  FRESH_UNIFIED_INFERENCE_TOKEN: "server-secret",
  FRESH_AI_VIDEO_ENGINE_URL: "https://fresh.example/video",
  FRESH_AI_VIDEO_ENGINE_TOKEN: "server-secret",
});
assert.equal(find(configured, "fresh-unified").state, "configured-not-verified");
assert.equal(find(configured, "video-generation").state, "configured-not-verified");
assert.equal(find(configured, "video-generation").executable, false);

const job = {
  jobId: "job-001",
  requestId: "request-001",
  idempotencyKey: "idem-001",
  userId: "user-001",
  engineId: "simulation",
  environment: "simulation",
  consentGranted: true,
  input: { text: "move forward" },
};
const adapter = async (received) => ({
  jobId: received.jobId,
  engineId: received.engineId,
  modelId: "fresh-unified-1",
  status: "completed",
  artifacts: [],
  metadata: { steps: 1 },
});
const result = await executeFreshAIEngineJob(job, empty, { simulation: adapter });
assert.equal(result.status, "completed");
assert.equal(result.jobId, job.jobId);

await assert.rejects(
  executeFreshAIEngineJob({ ...job, consentGranted: false }, empty, { simulation: adapter }),
  /consent/i,
);
await assert.rejects(
  executeFreshAIEngineJob(job, empty, {}),
  /no registered execution adapter/i,
);
await assert.rejects(
  executeFreshAIEngineJob({ ...job, engineId: "video-generation", environment: "evaluation" }, configured, { "video-generation": adapter }),
  /not executable/i,
);
await assert.rejects(
  executeFreshAIEngineJob({ ...job, engineId: "robotics" }, empty, { robotics: adapter }),
  /physical robotics execution is blocked/i,
);
await assert.rejects(
  executeFreshAIEngineJob(job, empty, { simulation: async () => ({ ...await adapter(job), jobId: "wrong-job" }) }),
  /invalid or mismatched execution result/i,
);
await assert.rejects(
  executeFreshAIEngineJob({ ...job, input: { text: "x".repeat(32_001) } }, empty, { simulation: adapter }),
  /32,000 characters/i,
);
console.log("Fresh AI shared engine fabric tests passed.");
