import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync("training/runs/colab-experiment-registry-v1.json", "utf8"));
const runtimeRegistry = readFileSync("src/core/fresh-ai/FreshAIColabExperimentRegistry.ts", "utf8");
assert.equal(registry.schema, "fresh-ai-colab-experiment-registry-v1");
assert.equal(registry.modelId, "fresh-unified-1");
assert.equal(registry.baseline.runId, "fresh-unified-1-run3");
assert.equal(registry.policy.promotionAllowed, false);
assert.equal(registry.policy.runtimeSwitchAllowed, false);
assert.match(runtimeRegistry, /servingCheckpointUnchanged:\s*true/);
assert.match(runtimeRegistry, /autoPromotion:\s*false/);
assert.equal(registry.runs.length, 4);

for (const run of registry.runs) {
  assert.ok([6, 7, 8, 9].includes(run.run));
  assert.equal(run.promotionEligible, false);
  assert.ok(run.sourceNotebook.endsWith(".ipynb"));
  assert.match(runtimeRegistry, new RegExp(`run: ${run.run},`));
  assert.ok(runtimeRegistry.includes(run.runId));
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
