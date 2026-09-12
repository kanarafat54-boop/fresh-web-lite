import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const recordPath = process.argv[2];
if (!recordPath) throw new Error("Usage: node scripts/verify-fresh-training-run-record.mjs <record.json>");
const record = JSON.parse(readFileSync(recordPath, "utf8"));

if (record.schema !== "fresh-unified-training-run-record-v1") throw new Error("Invalid training-run record schema");
if (record.modelId !== "fresh-unified-1") throw new Error("Training record must target fresh-unified-1");
if (record.sovereignty?.providerIndependent !== true || record.sovereignty?.requiresExternalModelProvider !== false) throw new Error("Training record violates Fresh sovereignty");
if (record.execution?.status !== "planned") throw new Error("This verifier accepts only an explicitly prepared, non-trained record");
if (record.execution?.checkpointId !== null || record.execution?.checkpointSha256 !== null) throw new Error("Prepared record must not invent checkpoint evidence");
if (record.gates?.training !== "not-run" || record.gates?.evaluation !== "not-run" || record.gates?.safety !== "not-run" || record.gates?.checkpoint !== "missing") throw new Error("Prepared record has inconsistent training/checkpoint gates");
if (!record.dataset?.path || !record.dataset?.sha256 || !Number.isInteger(record.dataset?.exampleCount) || record.dataset.exampleCount < 1) throw new Error("Dataset binding is incomplete");
if (!record.curriculum?.path || record.curriculum.id !== "fresh-unified-curriculum-v1" || !record.curriculum.sha256) throw new Error("Curriculum binding is incomplete");

const dataset = readFileSync(record.dataset.path, "utf8");
const curriculum = readFileSync(record.curriculum.path, "utf8");
const digest = (value) => createHash("sha256").update(value, "utf8").digest("hex");
if (digest(dataset) !== record.dataset.sha256) throw new Error("Dataset SHA-256 does not match the training record");
if (digest(curriculum) !== record.curriculum.sha256) throw new Error("Curriculum SHA-256 does not match the training record");
if (!curriculum.includes('modelId: "fresh-unified-1"')) throw new Error("Curriculum/model binding is invalid");

const lines = dataset.split(/\r?\n/).filter((line) => line.trim());
if (lines.length !== record.dataset.exampleCount) throw new Error("Dataset example count changed after preparation");
for (const line of lines) {
  const row = JSON.parse(line);
  if (row.metadata?.sourceType === "synthetic-starter" && row.metadata?.license !== "internal-synthetic") throw new Error(`Synthetic example ${row.id} has unexpected license metadata`);
}

console.log("Fresh Unified training-run record: PASS");
console.log(`Model: ${record.modelId}`);
console.log(`Dataset SHA-256: ${record.dataset.sha256}`);
console.log(`Curriculum: ${record.curriculum.id}`);
console.log("Training status: NOT TRAINED — checkpoint evidence is intentionally absent.");
