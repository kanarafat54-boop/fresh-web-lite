import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const script = path.join(root, "scripts/prepare-fresh-learning-candidates.mjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-learning-test-"));
try {
  const input = path.join(dir, "feedback.jsonl");
  const output = path.join(dir, "candidates.jsonl");
  const manifestPath = path.join(dir, "manifest.json");
  const valid = {
    id: "case-1",
    input: "Who is Elon Musk?",
    target: "A reviewed answer that identifies Elon Musk and cites checked sources.",
    consent: "explicit-training-opt-in",
    reviewStatus: "approved",
    metadata: { sourceType: "user-corrected-feedback", license: "user-consented", authorizationId: "consent-record-1", domain: "research" }
  };
  const run = rows => {
    fs.writeFileSync(input, rows.map(row => JSON.stringify(row)).join("\n") + "\n");
    return spawnSync(process.execPath, [script, "--input", input, "--output", output, "--manifest", manifestPath], { encoding: "utf8" });
  };
  let result = run([valid]);
  assert.equal(result.status, 0, result.stderr);
  const candidate = JSON.parse(fs.readFileSync(output, "utf8").trim());
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(candidate.input, valid.input);
  assert.equal(candidate.metadata.reviewStatus, "approved");
  assert.equal(manifest.exampleCount, 1);
  assert.equal(manifest.productionReady, false);
  assert.equal(manifest.modelWeightsModified, false);
  assert.equal(manifest.requiresTrainingEvaluationAndPromotionReview, true);

  result = run([{ ...valid, id: "no-consent", consent: "unknown" }]);
  assert.notEqual(result.status, 0, "Missing explicit consent must be rejected");
  result = run([{ ...valid, id: "pending", reviewStatus: "pending" }]);
  assert.notEqual(result.status, 0, "Unreviewed feedback must be rejected");
  result = run([{ ...valid, id: "secret", input: "token sk-proj-abcdefghijklmnopqrstuvwxyz123456" }]);
  assert.notEqual(result.status, 0, "Credential-like content must be rejected");
  result = run([valid, valid]);
  assert.notEqual(result.status, 0, "Duplicate IDs must be rejected");
  console.log("Fresh AI consented learning candidate checks: PASS");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
