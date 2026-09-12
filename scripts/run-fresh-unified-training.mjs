#!/usr/bin/env node
/**
 * Prepare (but never fake) a real Fresh Unified training run.
 *
 * This runner consumes the starter dataset + curriculum, validates their
 * binding, computes immutable digests, and writes a training-job record in
 * `planned` state. A real backend must move the record through running /
 * evaluating and attach a real checkpoint before it can become validated.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const datasetPath = process.argv[2] ?? "data/fresh-training/synthetic-starter-v1.jsonl";
const curriculumPath = process.argv[3] ?? "src/core/fresh-ai/FreshUnifiedTrainingCurriculum.ts";
const outputPath = process.argv[4] ?? `artifacts/fresh-training/jobs/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
function requiredFile(path) {
  const absolute = resolve(root, path);
  try { return { absolute, text: readFileSync(absolute, "utf8") }; }
  catch (error) { throw new Error(`Required training input is missing: ${path} (${error.message})`); }
}
function parseJsonl(text) {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Invalid JSONL at line ${i + 1}: ${error.message}`); }
  });
  if (rows.length === 0) throw new Error("Training dataset is empty");
  const ids = new Set();
  for (const row of rows) {
    if (!row.id || !row.input || !row.target) throw new Error("Every training example requires id, input, and target");
    if (ids.has(row.id)) throw new Error(`Duplicate training example: ${row.id}`);
    ids.add(row.id);
    if (!row.metadata?.domain || !row.metadata?.sourceType || !row.metadata?.license) {
      throw new Error(`Training example ${row.id} is missing domain/sourceType/license metadata`);
    }
  }
  return rows;
}

const dataset = requiredFile(datasetPath);
const curriculum = requiredFile(curriculumPath);
const examples = parseJsonl(dataset.text);

if (!curriculum.text.includes('id: "fresh-unified-curriculum-v1"')) throw new Error("Unexpected curriculum contract ID");
if (!curriculum.text.includes('modelId: "fresh-unified-1"')) throw new Error("Curriculum is not bound to fresh-unified-1");
if (!curriculum.text.includes("synthetic-starter-plus-lawful-public-licensed-authorized-data")) throw new Error("Curriculum data policy is missing");
if (!dataset.text.includes('"sourceType":"synthetic-starter"')) throw new Error("Starter dataset provenance marker is missing");

const job = {
  schema: "fresh-unified-training-run-record-v1",
  jobId: `fresh-${randomUUID()}`,
  modelId: "fresh-unified-1",
  dataset: {
    path: datasetPath,
    sha256: sha256(dataset.text),
    exampleCount: examples.length,
  },
  curriculum: {
    path: curriculumPath,
    id: "fresh-unified-curriculum-v1",
    sha256: sha256(curriculum.text),
  },
  provenancePolicy: "synthetic-starter-plus-lawful-public-licensed-authorized-data",
  execution: {
    status: "planned",
    checkpointId: null,
    checkpointSha256: null,
    checkpointEvidence: null,
  },
  gates: {
    datasetIntegrity: "passed",
    curriculumBinding: "passed",
    provenanceBinding: "passed",
    training: "not-run",
    evaluation: "not-run",
    safety: "not-run",
    checkpoint: "missing",
  },
  sovereignty: {
    providerIndependent: true,
    requiresExternalModelProvider: false,
  },
  createdAt: new Date().toISOString(),
  note: "Preparation record only. No weights were trained or created by this runner.",
};

const destination = resolve(root, outputPath);
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, `${JSON.stringify(job, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, outputPath, jobId: job.jobId, modelId: job.modelId, status: job.execution.status, datasetSha256: job.dataset.sha256, exampleCount: job.dataset.exampleCount }, null, 2));
