import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const dataset = path.join(root, "data/fresh-training/synthetic-starter-v1.jsonl");
const output = path.join(root, "artifacts/fresh-training/tokenizer/starter-tokenizer.json");
fs.mkdirSync(path.dirname(output), { recursive: true });

const result = spawnSync("python3", ["training/train_fresh_tokenizer.py", "--dataset", dataset, "--output", output], {
  cwd: root,
  encoding: "utf8",
});
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.status !== 0) throw new Error(`Fresh tokenizer training failed with exit code ${result.status}`);

const artifact = JSON.parse(fs.readFileSync(output, "utf8"));
const manifest = artifact.manifest;
if (manifest.schema !== "fresh-unified-tokenizer-artifact-v1") throw new Error("Invalid tokenizer artifact schema");
if (manifest.modelId !== "fresh-unified-1") throw new Error("Tokenizer artifact is not bound to fresh-unified-1");
if (manifest.tokenizerId !== "fresh-unified-tokenizer-v1") throw new Error("Invalid tokenizer ID");
if (manifest.vocabSize !== 32000) throw new Error("Tokenizer vocab size must match Fresh model spec");
if (manifest.status !== "starter-trained") throw new Error("Unexpected tokenizer training status");
if (manifest.productionReady !== false) throw new Error("Starter tokenizer must not be production-ready");
if (!/^[a-f0-9]{64}$/.test(manifest.datasetSha256)) throw new Error("Tokenizer dataset hash is missing or invalid");
if (!Array.isArray(artifact.merges)) throw new Error("Tokenizer merges are missing");
for (const merge of artifact.merges) {
  if (!merge.left || !merge.right || !Number.isInteger(merge.tokenId)) throw new Error("Invalid tokenizer merge record");
}
console.log(`Fresh tokenizer training verifier: PASS (${artifact.merges.length} deterministic merges)`);
console.log("Tokenizer is trained from the authorized starter corpus; production readiness remains blocked.");
