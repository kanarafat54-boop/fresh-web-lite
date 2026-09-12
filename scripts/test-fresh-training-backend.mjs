import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const dataset = "data/fresh-training/synthetic-starter-v1.jsonl";
const backend = "training/train_fresh_unified.py";
if (!existsSync(dataset)) throw new Error(`Missing dataset: ${dataset}`);
if (!existsSync(backend)) throw new Error(`Missing backend: ${backend}`);

const result = spawnSync("python3", [backend, "--dataset", dataset, "--output", ".fresh-training-smoke", "--dry-run"], { encoding: "utf8" });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  throw new Error("Fresh Unified training backend smoke test failed");
}
if (!result.stdout.includes("status=planned")) throw new Error("Smoke test did not remain planned");
if (!result.stdout.includes("checkpoint=not-created")) throw new Error("Smoke test did not prove checkpoint absence");
console.log("Fresh Unified training backend smoke test: PASS");
