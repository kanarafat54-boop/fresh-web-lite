import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { transformLacunaRows } from "./lib/fresh-hf-translation-transform.mjs";

const transformMetadata = {
  datasetId: "aceuganda/lacuna-luganda-health-corpus",
  revision: "0123456789abcdef0123456789abcdef01234567",
  config: "default",
  split: "train",
  sourceSha256: "a".repeat(64),
  candidateId: "hf-aceuganda-lacuna-luganda-health-corpus",
  authorizationId: "fixture-approved-authorization",
  license: "CC BY 4.0",
  evidenceRef: "review-packet-fixture",
  sourceLicenseEvidenceRef: "https://creativecommons.org/licenses/by/4.0/legalcode"
};
const enToLg = {
  translation_id: "fixture-en-lg",
  source_statement: "Wash your hands before preparing food.",
  approved_translation: "Naaba engalo zo nga tonnatandika kuteekateeka mmere.",
  source_language: "english",
  target_language: "luganda",
  split: "train"
};
const lgToEn = {
  translation_id: "fixture-lg-en",
  source_statement: "Naaba engalo zo.",
  approved_translation: "Wash your hands.",
  source_language: "luganda",
  target_language: "english",
  split: "train"
};
const transformed = transformLacunaRows([JSON.stringify(enToLg), JSON.stringify(lgToEn)], transformMetadata);
assert.equal(transformed.examples.length, 1, "pilot should keep only English-to-Luganda rows");
assert.equal(transformed.skippedReverseDirectionCount, 1, "reverse direction should be counted, not silently mixed");
assert.equal(transformed.examples[0].metadata.direction, "en-to-lg");
assert.throws(() => transformLacunaRows([JSON.stringify({ ...enToLg, split: "test" })], transformMetadata), /refusing leakage/i);
assert.throws(() => transformLacunaRows([JSON.stringify(enToLg), JSON.stringify(enToLg)], transformMetadata), /duplicate translation ID/i);

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
  console.log("Fresh Hugging Face translation intake: PASS (authorization fail-closed; direction filter; duplicate and held-out split protections)");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
