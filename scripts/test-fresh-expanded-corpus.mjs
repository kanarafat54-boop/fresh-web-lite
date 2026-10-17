import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataset = "data/fresh-training/fresh-unified-expanded-v1.jsonl";
const tokenizer = "artifacts/fresh-training/fresh-unified-expanded-tokenizer.json";
const checkpoint = "artifacts/fresh-training/fresh-unified-expanded-smoke.pt";
const formatted = "artifacts/fresh-training/fresh-unified-expanded-hf.jsonl";
const job = "artifacts/fresh-training/jobs/expanded-corpus-ci.json";

function run(command, args, label) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`${label} failed (exit ${result.status})`);
}

const raw = fs.readFileSync(dataset, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
if (raw.length !== 83) throw new Error(`Expected 83 combined examples, got ${raw.length}`);
if (new Set(raw.map((row) => row.id)).size !== raw.length) throw new Error("Combined dataset IDs are not unique");
if (!raw.some((row) => row.metadata?.sourceType === "internal-synthetic" && row.metadata?.authorizationId === "fwl-internal-synthetic-v1")) throw new Error("Curated authorized examples are missing");
run("python3", ["training/prepare_fresh_hf_dataset.py", "--input", dataset, "--output", formatted], "Hugging Face text-format export");
const exported = fs.readFileSync(formatted, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));
if (exported.length !== 83 || !exported.every((row) => row.text.includes("User: ") && row.text.includes("Assistant: "))) throw new Error("HF export is incomplete or malformed");
run("python3", ["training/train_fresh_tokenizer.py", "--dataset", dataset, "--output", tokenizer], "Expanded corpus tokenizer training");
run("python3", ["training/train_fresh_unified.py", "--dataset", dataset, "--tokenizer", tokenizer, "--output", checkpoint, "--dry-run"], "Expanded corpus model dry-run");
if (fs.existsSync(checkpoint)) throw new Error("Dry-run unexpectedly created model weights");
run("python3", ["training/train_fresh_unified.py", "--dataset", dataset, "--tokenizer", tokenizer, "--output", checkpoint, "--spec", "training/model_spec_smoke.json", "--train", "--steps", "1", "--seed", "42"], "One-step PyTorch Dataset/DataLoader optimizer smoke test");
if (!fs.existsSync(checkpoint) || !fs.existsSync(checkpoint + ".json")) throw new Error("One-step optimizer run did not create checkpoint and manifest");
const trainingManifest = JSON.parse(fs.readFileSync(checkpoint + ".json", "utf8"));
if (trainingManifest.steps !== 1 || trainingManifest.pipelineSmokeTest !== true || trainingManifest.datasetSha256 !== JSON.parse(fs.readFileSync(tokenizer, "utf8")).manifest.datasetSha256) throw new Error("Optimizer smoke checkpoint is not bound to the exact expanded corpus");
fs.unlinkSync(checkpoint);
fs.unlinkSync(checkpoint + ".json");
run("node", ["scripts/run-fresh-unified-training.mjs", "--dataset", dataset, "--curriculum", "src/core/fresh-ai/FreshUnifiedTrainingCurriculum.ts", "--output", job], "Expanded corpus run preparation");
const record = JSON.parse(fs.readFileSync(job, "utf8"));
if (record.dataset.exampleCount !== 83 || record.execution.status !== "planned" || record.gates.training !== "not-run") throw new Error("Prepared run record does not reflect expanded corpus or honest status");
console.log("Fresh expanded corpus integration: PASS (83 authorized examples; native tokenizer; dry-run and one-step optimizer verified; smoke checkpoint removed)");
