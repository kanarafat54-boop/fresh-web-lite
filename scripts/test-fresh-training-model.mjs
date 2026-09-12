import { spawnSync } from "node:child_process";

const result = spawnSync("python3", ["training/test_fresh_model.py"], { encoding: "utf8" });
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "");
  throw new Error("Fresh Unified model smoke test failed");
}
process.stdout.write(result.stdout);
