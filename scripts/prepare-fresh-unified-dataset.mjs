#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
let inputPath;
let outputPath;
const positional = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--dataset") {
    inputPath = args[++i];
    if (!inputPath) throw new Error("--dataset requires a path");
  } else if (arg === "--output") {
    outputPath = args[++i];
    if (!outputPath) throw new Error("--output requires a path");
  } else if (arg.startsWith("--")) {
    throw new Error(`Unknown option: ${arg}`);
  } else {
    positional.push(arg);
  }
}
inputPath ??= positional[0];
outputPath ??= positional[1] ?? "fresh-unified-dataset.manifest.json";
if (!inputPath) {
  console.error("Usage: node scripts/prepare-fresh-unified-dataset.mjs <dataset.jsonl> [manifest.json]");
  console.error("   or: node scripts/prepare-fresh-unified-dataset.mjs --dataset <dataset.jsonl> --output <manifest.json>");
  process.exit(1);
}

const lines = fs.readFileSync(inputPath, "utf8").split(/\r?\n/).filter(Boolean);
const ids = new Set();
const examples = lines.map((line, index) => {
  let value;
  try { value = JSON.parse(line); } catch { throw new Error(`Invalid JSON on line ${index + 1}`); }
  if (!value.id || !value.input || !value.target) throw new Error(`Example on line ${index + 1} requires id, input and target`);
  if (ids.has(value.id)) throw new Error(`Duplicate example id: ${value.id}`);
  ids.add(value.id);
  return { id: value.id, input: value.input, target: value.target, metadata: value.metadata ?? {} };
});
if (!examples.length) throw new Error("Dataset is empty");
const canonical = examples.map((e) => JSON.stringify(e)).join("\n");
const manifest = {
  datasetId: `fresh-dataset-${crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16)}`,
  modelId: "fresh-unified-1",
  format: "fresh-unified-jsonl-v1",
  exampleCount: examples.length,
  sha256: crypto.createHash("sha256").update(canonical).digest("hex"),
  status: "validated",
  weightsCreated: false,
  checkpointCreated: false,
};

const outputDir = path.dirname(outputPath);
if (outputDir && outputDir !== ".") fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Fresh dataset validated: ${examples.length} examples`);
console.log(`Manifest: ${outputPath}`);
console.log("No model weights or checkpoint were created.");
