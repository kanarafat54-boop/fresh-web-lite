import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";

const output = "artifacts/fresh-training/prepared-starter.json";
const result = spawnSync("python3", ["training/prepare_fresh_dataset.py", "--input", "data/fresh-training/synthetic-starter-v1.jsonl", "--output", output], { encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "dataset preparation failed");
if (!existsSync(output)) throw new Error("prepared dataset was not created");
unlinkSync(output);
console.log(result.stdout.trim());
console.log("Fresh dataset preparation smoke test: PASS");
