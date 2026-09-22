#!/usr/bin/env node
/**
 * Offline training dry-run — does not affect Vercel builds.
 * Validates dataset + curriculum binding and writes a planned job record only.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const runner = resolve(root, "scripts/run-fresh-unified-training.mjs");
const dataset = resolve(root, "data/fresh-training/synthetic-starter-v1.jsonl");
const curriculum = resolve(root, "src/core/fresh-ai/FreshUnifiedTrainingCurriculum.ts");

if (!existsSync(runner)) throw new Error("Missing scripts/run-fresh-unified-training.mjs");
if (!existsSync(dataset)) throw new Error("Missing synthetic starter dataset");
if (!existsSync(curriculum)) throw new Error("Missing training curriculum");

const result = spawnSync(
  process.execPath,
  [runner, "--dataset", "data/fresh-training/synthetic-starter-v1.jsonl", "--curriculum", "src/core/fresh-ai/FreshUnifiedTrainingCurriculum.ts"],
  { cwd: root, encoding: "utf8" },
);

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Fresh training dry-run: PASS (planned job only — no weights created).");
console.log("Production training remains blocked until authorized corpus + GPU run + evaluation gate.");
