import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FRESH_AI_COLAB_EXPERIMENTS, FRESH_AI_COLAB_EXPERIMENT_POLICY } from "../src/core/fresh-ai/FreshAIColabExperimentRegistry.ts";

const registry = JSON.parse(readFileSync("training/runs/colab-experiment-registry-v1.json", "utf8"));
assert.equal(registry.schema, "fresh-ai-colab-experiment-registry-v1");
assert.equal(registry.modelId, "fresh-unified-1");
assert.equal(registry.baseline.runId, "fresh-unified-1-run3");
assert.equal(registry.policy.promotionAllowed, false);
assert.equal(registry.policy.runtimeSwitchAllowed, false);
assert.equal(FRESH_AI_COLAB_EXPERIMENT_POLICY.servingCheckpointUnchanged, true);
assert.equal(FRESH_AI_COLAB_EXPERIMENTS.length, 4);

for (const item of FRESH_AI_COLAB_EXPERIMENTS) {
  const record = registry.runs.find((run) => run.run === item.run);
  assert.ok(record, `Missing JSON evidence for Run ${item.run}`);
  assert.equal(record.runId, item.runId);
  assert.equal(record.kind, item.kind);
  assert.equal(record.status, item.status);
  assert.equal(record.promotionEligible, false);
  assert.equal(record.sourceNotebook, item.sourceNotebook);
}
const run7 = registry.runs.find((run) => run.run === 7);
assert.equal(run7.status, "prepared-not-executed");
assert.equal(run7.manualReviewEntries, 0);
const run8 = registry.runs.find((run) => run.run === 8);
assert.equal(run8.evaluation.taughtFacts.passed, 34);
assert.deepEqual(run8.evaluation.retentionRegressionGroups, ["dolly", "wikipedia-sw"]);
const run9 = registry.runs.find((run) => run.run === 9);
assert.equal(run9.evaluation.taughtFacts.passed, 5);
assert.equal(run9.evaluation.passageGrounding.passed, 1);
assert.equal(run9.checkpoint.initFromSha256, registry.baseline.checkpointSha256);
console.log("Fresh AI Colab experiment registry: PASS (Runs 6–9 recorded; no checkpoint promoted).");
