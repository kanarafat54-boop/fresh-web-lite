#!/usr/bin/env node
/** Prepare a provider-independent Fresh Unified training run without fabricating weights. */
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const flags = new Map();
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
  const name = arg.slice(2);
  const value = args[++i];
  if (value === undefined || value.startsWith("--")) throw new Error(`Flag --${name} requires a value`);
  flags.set(name, value);
}
const datasetPath = flags.get("dataset") ?? "data/fresh-training/synthetic-starter-v1.jsonl";
const curriculumPath = flags.get("curriculum") ?? "src/core/fresh-ai/FreshUnifiedTrainingCurriculum.ts";
const outputPath = flags.get("output") ?? `artifacts/fresh-training/jobs/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
function readRequired(path) {
  const absolute = resolve(root, path);
  try { return { absolute, text: readFileSync(absolute, "utf8") }; }
  catch (error) { throw new Error(`Required training input is missing: ${path} (${error.message})`); }
}
function parseJsonl(text) {
  const rows = [];
  const ids = new Set();
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch (error) { throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`); }
    if (!row.id || !row.input || !row.target) throw new Error(`Example at line ${index + 1} requires id, input and target`);
    if (ids.has(row.id)) throw new Error(`Duplicate training example: ${row.id}`);
    ids.add(row.id);
    if (!row.metadata?.domain || !row.metadata?.sourceType || !row.metadata?.license) throw new Error(`Training example ${row.id} is missing provenance metadata`);
    rows.push(row);
  }
  if (!rows.length) throw new Error("Training dataset is empty");
  return rows;
}

const dataset = readRequired(datasetPath);
const curriculum = readRequired(curriculumPath);
const examples = parseJsonl(dataset.text);

// Bind against the canonical curriculum source without depending on formatting.
if (!curriculum.text.includes("fresh-unified-curriculum-v1")) throw new Error("Unexpected curriculum contract ID");
const modelBound = /modelId\s*:\s*FRESH_UNIFIED_MODEL\.id/.test(curriculum.text) || /modelId\s*:\s*[\"']fresh-unified-1[\"']/.test(curriculum.text);
if (!modelBound) throw new Error("Curriculum is not bound to fresh-unified-1");
if (!curriculum.text.includes("synthetic-starter-plus-lawful-public-licensed-authorized-data")) throw new Error("Curriculum data policy is missing");
if (!examples.every((row) => row.metadata.sourceType === "synthetic-starter")) throw new Error("Starter preparation requires synthetic-starter provenance");

const job = {
  schema: "fresh-unified-training-run-record-v1",
  jobId: `fresh-${randomUUID()}`,
  modelId: "fresh-unified-1",
  dataset: { path: datasetPath, sha256: sha256(dataset.text), exampleCount: examples.length },
  curriculum: { path: curriculumPath, id: "fresh-unified-curriculum-v1", sha256: sha256(curriculum.text) },
  provenancePolicy: "synthetic-starter-plus-lawful-public-licensed-authorized-data",
  execution: { status: "planned", checkpointId: null, checkpointSha256: null, checkpointEvidence: null },
  gates: { datasetIntegrity: "passed", curriculumBinding: "passed", provenanceBinding: "passed", training: "not-run", evaluation: "not-run", safety: "not-run", checkpoint: "missing" },
  sovereignty: { providerIndependent: true, requiresExternalModelProvider: false },
  createdAt: new Date().toISOString(),
  note: "Preparation record only. No weights were trained or created by this runner."
};
const destination = resolve(root, outputPath);
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, `${JSON.stringify(job, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, outputPath, jobId: job.jobId, modelId: job.modelId, status: job.execution.status, datasetSha256: job.dataset.sha256, exampleCount: job.dataset.exampleCount }, null, 2));
