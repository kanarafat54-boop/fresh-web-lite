#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
function fail(message) {
  console.error(`Fresh HF translation intake BLOCKED: ${message}`);
  process.exit(1);
}
const inputPath = readFlag("--dataset");
const outputPath = readFlag("--output");
const manifestPath = readFlag("--manifest");
const datasetId = readFlag("--dataset-id");
const candidateId = readFlag("--candidate-id");
const authorizationId = readFlag("--authorization-id");
const revision = readFlag("--revision");
const config = readFlag("--config") ?? "default";
const split = readFlag("--split");
if (!inputPath || !outputPath || !manifestPath || !datasetId || !candidateId || !authorizationId || !revision || !split) {
  fail("required flags: --dataset --output --manifest --dataset-id --candidate-id --authorization-id --revision --split");
}
if (split !== "train") fail("only the train split may be transformed for training; validation/test are held out");
if (config !== "default") fail("this adapter only supports the reviewed default config");
if (!/^[a-f0-9]{40}$/i.test(revision)) fail("revision must be an immutable 40-character Hugging Face commit SHA");

const root = process.cwd();
const candidateRegistry = JSON.parse(fs.readFileSync(path.join(root, "training/fresh_corpus_candidates.json"), "utf8"));
const authorizationRegistry = JSON.parse(fs.readFileSync(path.join(root, "training/fresh_corpus_authorizations.json"), "utf8"));
const candidate = candidateRegistry.sources.find((item) => item.candidateId === candidateId);
if (!candidate) fail(`candidate ${candidateId} is not in the reviewed candidate registry`);
if (candidate.datasetId !== datasetId) fail("dataset ID does not match the registered candidate");
if (candidate.status !== "eligible" || candidate.trainingEligible !== true) {
  fail(`candidate ${candidateId} is still review-required; no dataset content was ingested`);
}
for (const review of ["rights", "privacy", "safety", "quality"]) {
  if (candidate.reviews?.[review] !== "passed") fail(`${review} review is not passed for ${candidateId}`);
}
const authorization = authorizationRegistry.sources.find((item) => item.authorizationId === authorizationId);
if (!authorization) fail(`authorization ${authorizationId} is not registered`);
if (authorization.candidateId !== candidateId) fail("authorization is not explicitly bound to this dataset candidate");
if (authorization.status !== "eligible") fail("authorization status is not eligible");
if (authorization.trainingPermission !== "verified") fail("training permission is not verified");
if (authorization.commercialTrainingPermission !== "verified") fail("commercial training permission is not verified");
if (authorization.derivativeModelPermission !== "verified") fail("derivative-model permission is not verified");
if (!authorization.evidenceRef) fail("authorization evidence reference is missing");
if (authorization.license !== candidate.license) fail("candidate and authorization licenses do not match");
if (!candidate.evidenceRefs?.includes(authorization.sourceLicenseEvidenceRef)) {
  fail("authorization must reference a license-evidence URL listed on the candidate");
}
const sourcePath = path.resolve(inputPath);
if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) fail("dataset export file does not exist");
const sourceBytes = fs.readFileSync(sourcePath);
const sourceSha256 = crypto.createHash("sha256").update(sourceBytes).digest("hex");
const lines = sourceBytes.toString("utf8").split(/\r?\n/).filter((line) => line.trim());
if (!lines.length) fail("dataset export is empty");
if (lines.length > 100000) fail("dataset export exceeds the 100,000-row pilot limit");

const seen = new Set();
const examples = [];
let skippedReverseDirectionCount = 0;
for (let index = 0; index < lines.length; index += 1) {
  let row;
  try { row = JSON.parse(lines[index]); } catch { fail(`invalid JSON on source line ${index + 1}`); }
  const sourceId = String(row.translation_id ?? "").trim();
  const sourceText = String(row.source_statement ?? "").trim();
  const targetText = String(row.approved_translation ?? "").trim();
  const sourceLanguage = String(row.source_language ?? "").trim().toLowerCase();
  const targetLanguage = String(row.target_language ?? "").trim().toLowerCase();
  if (!sourceId || !sourceText || !targetText) fail(`source line ${index + 1} is missing a translation ID or text`);
  if (seen.has(sourceId)) fail(`duplicate translation ID: ${sourceId}`);
  seen.add(sourceId);
  if (row.split && row.split !== "train") fail(`source line ${index + 1} claims split ${row.split}; refusing leakage into train`);
  if (sourceText.length > 50000 || targetText.length > 50000) fail(`source line ${index + 1} exceeds the text length limit`);
  if (sourceLanguage === "luganda" && targetLanguage === "english") {
    skippedReverseDirectionCount += 1;
    continue;
  }
  if (sourceLanguage !== "english" || targetLanguage !== "luganda") {
    fail(`source line ${index + 1} has an unsupported language direction`);
  }
  examples.push({
    id: `hf-lacuna-luganda-${sourceId}`,
    input: `Translate the following English health text into Luganda. Preserve the source meaning and uncertainty. This is translation training material, not medical advice.\n\nEnglish: ${sourceText}`,
    target: targetText,
    metadata: {
      domain: "translation-health",
      direction: "en-to-lg",
      sourceType: "huggingface-dataset",
      datasetId,
      datasetRevision: revision,
      datasetConfig: config,
      split,
      sourceRowId: sourceId,
      candidateId,
      authorizationId,
      license: candidate.license,
      evidenceRef: authorization.evidenceRef,
      sourceLicenseEvidenceRef: authorization.sourceLicenseEvidenceRef,
      sourceSha256,
      transformation: "fresh-hf-translation-v1",
      rightsReview: "passed",
      privacyReview: "passed",
      safetyReview: "passed",
      qualityReview: "passed",
      reviewStatus: "authorized-reviewed",
    },
  });
}
if (!examples.length) fail("no English-to-Luganda rows were found in the training split");
const canonical = examples.map((example) => JSON.stringify(example)).join("\n") + "\n";
const outputSha256 = crypto.createHash("sha256").update(canonical).digest("hex");
const manifest = {
  schema: "fresh-hf-translation-manifest-v1",
  modelId: "fresh-unified-1",
  datasetId,
  candidateId,
  authorizationId,
  sourceUrl: candidate.sourceUrl,
  license: candidate.license,
  revision,
  config,
  split,
  sourceRowCount: lines.length,
  exampleCount: examples.length,
  skippedReverseDirectionCount,
  sourceSha256,
  outputSha256,
  transformation: "fresh-hf-translation-v1",
  status: "validated",
  productionTrainingEligible: false,
  weightsCreated: false,
  checkpointCreated: false,
  note: "Validated translation shard only. This manifest does not grant production promotion; model training and promotion require their separate gates.",
};
for (const target of [outputPath, manifestPath]) {
  const parent = path.dirname(path.resolve(target));
  fs.mkdirSync(parent, { recursive: true });
}
fs.writeFileSync(outputPath, canonical, { flag: "wx" });
try {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
} catch (error) {
  fs.rmSync(outputPath, { force: true });
  throw error;
}
console.log(`Fresh HF translation shard validated: ${examples.length} examples`);
console.log(`Dataset: ${datasetId}@${revision}; split=${split}; source SHA-256=${sourceSha256}`);
console.log(`Output SHA-256=${outputSha256}; production promotion remains false; no weights/checkpoint created.`);
