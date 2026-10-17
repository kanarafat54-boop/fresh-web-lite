import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseDataset = "data/fresh-training/fresh-unified-expanded-v1.jsonl";
const curatedDataset = "data/fresh-training/user-intake-curated-v1.jsonl";
const workDir = fs.mkdtempSync(path.join("artifacts/fresh-training", "ci-expanded-"));
const dataset = path.join(workDir, "generated-expanded-corpus-v1.jsonl");
const tokenizer = path.join(workDir, "tokenizer.json");
const checkpoint = path.join(workDir, "smoke.pt");
const formatted = path.join(workDir, "huggingface-text.jsonl");
const prepared = path.join(workDir, "prepared.json");
const job = path.join(workDir, "jobs", "run-record.json");

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`${label} failed (exit ${result.status})`);
}

function readJsonl(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSONL in ${file} at line ${index + 1}: ${error.message}`);
    }
  });
}

try {
  const baseRows = readJsonl(baseDataset);
  const curatedRows = readJsonl(curatedDataset);
  const seenIds = new Set(baseRows.map((row) => row.id));
  if (seenIds.has(undefined) || baseRows.some((row) => typeof row.id !== "string" || !row.id.trim())) {
    throw new Error("Base corpus contains a missing or invalid ID");
  }

  const additions = [];
  for (const row of curatedRows) {
    if (typeof row.id !== "string" || !row.id.trim()) throw new Error("Curated corpus contains a missing or invalid ID");
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    additions.push(row);
  }

  for (const row of additions) {
    const metadata = row.metadata ?? {};
    if (
      metadata.sourceType !== "internal-synthetic" ||
      metadata.license !== "internal-synthetic" ||
      metadata.authorizationId !== "fwl-internal-synthetic-v1" ||
      metadata.reviewStatus !== "curated-v1"
    ) {
      throw new Error(`New intake record ${row.id} is missing required synthetic provenance/review metadata`);
    }
  }

  const raw = [...baseRows, ...additions];
  fs.mkdirSync(path.dirname(dataset), { recursive: true });
  fs.writeFileSync(dataset, raw.map((row) => JSON.stringify(row)).join("\n") + "\n");
  if (raw.length !== 108) throw new Error(`Expected 108 combined examples, got ${raw.length}`);
  if (new Set(raw.map((row) => row.id)).size !== raw.length) throw new Error("Combined dataset IDs are not unique");
  if (additions.length !== 25) throw new Error(`Expected 25 newly curated additions, got ${additions.length}`);

  run("python3", ["training/prepare_fresh_hf_dataset.py", "--input", dataset, "--output", formatted], "Hugging Face text-format export");
  const exported = readJsonl(formatted);
  if (exported.length !== 108 || !exported.every((row) => typeof row.text === "string" && row.text.includes("User: ") && row.text.includes("Assistant: "))) {
    throw new Error("HF export is incomplete or malformed");
  }

  run("python3", ["training/prepare_fresh_dataset.py", "--input", dataset, "--output", prepared], "Canonical authorized dataset split");
  const preparedManifest = JSON.parse(fs.readFileSync(prepared, "utf8"));
  if (
    preparedManifest.exampleCount !== 108 ||
    preparedManifest.productionReady !== false ||
    Object.values(preparedManifest.splits).reduce((sum, split) => sum + split.length, 0) !== 108
  ) {
    throw new Error("Canonical dataset split is incomplete or incorrectly promoted");
  }

  run("python3", ["training/train_fresh_tokenizer.py", "--dataset", dataset, "--output", tokenizer], "Expanded corpus tokenizer training");
  run("python3", ["training/train_fresh_unified.py", "--dataset", dataset, "--tokenizer", tokenizer, "--output", checkpoint, "--dry-run"], "Expanded corpus model dry-run");
  if (fs.existsSync(checkpoint)) throw new Error("Dry-run unexpectedly created model weights");

  run("python3", ["training/train_fresh_unified.py", "--dataset", dataset, "--tokenizer", tokenizer, "--output", checkpoint, "--spec", "training/model_spec_smoke.json", "--train", "--steps", "1", "--seed", "42"], "One-step PyTorch Dataset/DataLoader optimizer smoke test");
  if (!fs.existsSync(checkpoint) || !fs.existsSync(checkpoint + ".json")) throw new Error("One-step optimizer run did not create checkpoint and manifest");
  const trainingManifest = JSON.parse(fs.readFileSync(checkpoint + ".json", "utf8"));
  if (
    trainingManifest.steps !== 1 ||
    trainingManifest.pipelineSmokeTest !== true ||
    trainingManifest.datasetSha256 !== JSON.parse(fs.readFileSync(tokenizer, "utf8")).manifest.datasetSha256
  ) {
    throw new Error("Optimizer smoke checkpoint is not bound to the exact expanded corpus");
  }

  run("node", ["scripts/run-fresh-unified-training.mjs", "--dataset", dataset, "--curriculum", "src/core/fresh-ai/FreshUnifiedTrainingCurriculum.ts", "--output", job], "Expanded corpus run preparation");
  const record = JSON.parse(fs.readFileSync(job, "utf8"));
  if (record.dataset.exampleCount !== 108 || record.execution.status !== "planned" || record.gates.training !== "not-run") {
    throw new Error("Prepared run record does not reflect expanded corpus or honest status");
  }
  console.log("Fresh expanded corpus integration: PASS (108 unique examples; 25 new reviewed synthetic records; native tokenizer; dry-run and one-step optimizer verified; smoke artifacts isolated for cleanup)");
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
