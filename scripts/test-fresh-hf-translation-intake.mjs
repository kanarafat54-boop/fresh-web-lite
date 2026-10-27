import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-hf-intake-"));
try {
  const source = path.join(temp, "rows.jsonl");
  const output = path.join(temp, "out.jsonl");
  const manifest = path.join(temp, "manifest.json");
  fs.writeFileSync(source, JSON.stringify({
    translation_id: "fixture-001",
    source_statement: "Wash your hands before preparing food.",
    approved_translation: "Naaba engalo zo nga tonnatandika kuteekateeka mmere.",
    source_language: "english",
    target_language: "luganda",
    split: "train"
  }) + "\n");
  const base = [
    "scripts/prepare-fresh-hf-translation-dataset.mjs",
    "--dataset", source,
    "--output", output,
    "--manifest", manifest,
    "--dataset-id", "aceuganda/lacuna-luganda-health-corpus",
    "--candidate-id", "hf-aceuganda-lacuna-luganda-health-corpus",
    "--authorization-id", "hf-lacuna-luganda-pending-review",
    "--revision", "0123456789abcdef0123456789abcdef01234567",
    "--config", "default"
  ];
  const blocked = spawnSync(process.execPath, [...base, "--split", "train"], { encoding: "utf8" });
  assert.notEqual(blocked.status, 0, "review-required candidate must fail closed");
  assert.match(blocked.stderr, /still review-required/i);
  assert.equal(fs.existsSync(output), false, "blocked intake must not write JSONL");
  assert.equal(fs.existsSync(manifest), false, "blocked intake must not write a manifest");

  const heldOut = spawnSync(process.execPath, [...base, "--split", "test"], { encoding: "utf8" });
  assert.notEqual(heldOut.status, 0, "test split must never be accepted as training data");
  assert.match(heldOut.stderr, /only the train split/i);
  assert.equal(fs.existsSync(output), false);
  console.log("Fresh Hugging Face translation intake: PASS (authorization fail-closed; held-out split protected)");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
