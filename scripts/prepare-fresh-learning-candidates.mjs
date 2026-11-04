#!/usr/bin/env node
/**
 * Prepare a reviewed, explicitly consented feedback set for a future Fresh
 * training job. This is data preparation only: it never trains or promotes weights.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
let inputPath, outputPath, manifestPath;
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--input") inputPath = args[++i];
  else if (arg === "--output") outputPath = args[++i];
  else if (arg === "--manifest") manifestPath = args[++i];
  else throw new Error(`Unknown option: ${arg}`);
}
if (!inputPath || !outputPath || !manifestPath) {
  console.error("Usage: node scripts/prepare-fresh-learning-candidates.mjs --input feedback.jsonl --output candidates.jsonl --manifest manifest.json");
  process.exit(2);
}

const lines = fs.readFileSync(inputPath, "utf8").split(/\r?\n/).filter(line => line.trim());
if (!lines.length) throw new Error("Feedback input is empty");
const ids = new Set();
const candidates = lines.map((line, index) => {
  let row;
  try { row = JSON.parse(line); } catch { throw new Error(`Invalid JSON on line ${index + 1}`); }
  if (typeof row.id !== "string" || !row.id.trim() || ids.has(row.id)) throw new Error(`Missing or duplicate feedback ID on line ${index + 1}`);
  ids.add(row.id);
  if (row.consent !== "explicit-training-opt-in") throw new Error(`Feedback ${row.id} lacks explicit training consent; excluded`);
  if (row.reviewStatus !== "approved") throw new Error(`Feedback ${row.id} has not passed human review; excluded`);
  if (row.metadata?.sourceType !== "user-corrected-feedback" || row.metadata?.license !== "user-consented" || typeof row.metadata?.authorizationId !== "string" || !row.metadata.authorizationId.trim()) {
    throw new Error(`Feedback ${row.id} lacks complete source, license, or authorization provenance`);
  }
  if (typeof row.input !== "string" || !row.input.trim() || typeof row.target !== "string" || !row.target.trim()) {
    throw new Error(`Feedback ${row.id} requires a reviewed input and corrected target`);
  }
  if (row.input.length > 4000 || row.target.length > 8000) throw new Error(`Feedback ${row.id} exceeds the text size limit`);
  const joined = row.input + "\n" + row.target;
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-proj-|sk-[A-Za-z0-9]{24,}|gh[pousr]_[A-Za-z0-9]{20,}|sb_secret_[A-Za-z0-9_]+)\b/i.test(joined)) {
    throw new Error(`Feedback ${row.id} appears to contain a secret; exclude and sanitize it before review`);
  }
  return {
    id: `feedback-${row.id}`,
    input: row.input.trim(),
    target: row.target.trim(),
    metadata: {
      domain: typeof row.metadata.domain === "string" ? row.metadata.domain.slice(0, 80) : "general",
      sourceType: "user-corrected-feedback",
      license: "user-consented",
      authorizationId: row.metadata.authorizationId,
      reviewStatus: "approved",
      origin: "fresh-ai-consented-learning-candidate",
    },
  };
});

const canonical = candidates.map(row => JSON.stringify(row)).join("\n") + "\n";
const digest = crypto.createHash("sha256").update(canonical).digest("hex");
for (const file of [outputPath, manifestPath]) fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
fs.writeFileSync(outputPath, canonical);
const manifest = {
  datasetId: `fresh-feedback-${digest.slice(0, 16)}`,
  modelId: "fresh-unified-1",
  format: "fresh-unified-jsonl-v1",
  exampleCount: candidates.length,
  sha256: digest,
  source: "explicitly-consented-and-human-reviewed-feedback",
  status: "candidate-dataset-prepared",
  productionReady: false,
  weightsCreated: false,
  checkpointCreated: false,
  modelWeightsModified: false,
  requiresTrainingEvaluationAndPromotionReview: true,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Prepared ${candidates.length} reviewed, consented learning candidate(s).`);
console.log("No model weights were trained or changed; evaluation and promotion remain separate gated steps.");
