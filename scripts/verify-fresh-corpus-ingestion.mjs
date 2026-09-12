import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "training", "fresh_corpus_ingestion_manifest.json");
const authPath = path.join(root, "training", "fresh_corpus_authorizations.json");
const candidatesPath = path.join(root, "training", "fresh_corpus_candidates.json");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const fail = (message) => { throw new Error(message); };

const manifest = readJson(manifestPath);
const auth = readJson(authPath);
const candidates = readJson(candidatesPath);

if (manifest.schema !== "fresh-corpus-ingestion-manifest-v1") fail("Invalid ingestion manifest schema");
if (manifest.modelId !== "fresh-unified-1") fail("Ingestion manifest is not bound to fresh-unified-1");
if (manifest.policy?.unknownSourcesBlocked !== true) fail("Unknown sources must be blocked");
if (manifest.policy?.authorizationRequired !== true) fail("Authorization is required");
if (manifest.policy?.rawContentMustBeHashVerified !== true) fail("Raw content hash verification is required");
if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) fail("Ingestion manifest has no sources");

const authById = new Map(auth.sources.map((s) => [s.authorizationId, s]));
const candidateById = new Map(candidates.sources.map((s) => [s.candidateId, s]));
const seen = new Set();

for (const source of manifest.sources) {
  if (!source.sourceId || seen.has(source.sourceId)) fail("Source IDs must be unique and non-empty");
  seen.add(source.sourceId);
  const authorization = authById.get(source.authorizationId);
  if (!authorization) fail(`Missing authorization for ${source.sourceId}`);
  if (authorization.status !== "eligible") fail(`Authorization is not eligible for ${source.sourceId}`);
  if (authorization.trainingPermission !== "verified") fail(`Training permission is not verified for ${source.sourceId}`);
  if (!authorization.evidenceRef) fail(`Missing authorization evidence for ${source.sourceId}`);
  if (source.trainingPermission !== "verified") fail(`Manifest training permission is not verified for ${source.sourceId}`);
  if (source.derivativeModelPermission !== "verified") fail(`Derivative-model permission is not verified for ${source.sourceId}`);
  if (!source.evidenceRef) fail(`Missing evidence reference for ${source.sourceId}`);
  if (source.contentSha256 !== "computed-by-ingestion") fail(`Manifest must use computed content hash for ${source.sourceId}`);
  if (!source.contentLocation) fail(`Missing content location for ${source.sourceId}`);

  const candidate = candidateById.get(source.sourceId);
  if (candidate && candidate.trainingEligible !== true && source.productionTrainingEligible === true) {
    fail(`Candidate source cannot be promoted without explicit eligibility: ${source.sourceId}`);
  }

  const contentPath = path.join(root, source.contentLocation);
  if (!fs.existsSync(contentPath)) fail(`Missing source content: ${source.contentLocation}`);
  const bytes = fs.readFileSync(contentPath);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (!sha256) fail(`Could not hash source content: ${source.sourceId}`);
}

for (const candidate of candidates.sources) {
  if (candidate.trainingEligible === true && !authById.has(candidate.candidateId)) {
    fail(`Candidate ${candidate.candidateId} is eligible without authorization registry entry`);
  }
}

console.log(`Fresh corpus ingestion manifest: PASS (${manifest.sources.length} authorized source(s))`);
console.log("Content hashes are computed during ingestion; candidate sources remain blocked by default.");
console.log("Production training eligibility: NOT GRANTED by this manifest.");
