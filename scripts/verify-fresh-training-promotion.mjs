import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const authPath = path.join(root, "training", "fresh_corpus_authorizations.json");
const ingestionPath = path.join(root, "training", "fresh_corpus_ingestion_manifest.json");
const candidatesPath = path.join(root, "training", "fresh_corpus_candidates.json");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const fail = (message) => { throw new Error(message); };

const auth = readJson(authPath);
const ingestion = readJson(ingestionPath);
const candidates = readJson(candidatesPath);

if (auth.schema !== "fresh-corpus-authorization-registry-v1") fail("Invalid authorization registry schema");
if (ingestion.schema !== "fresh-corpus-ingestion-manifest-v1") fail("Invalid ingestion manifest schema");
if (ingestion.modelId !== "fresh-unified-1") fail("Ingestion manifest is not bound to fresh-unified-1");
if (auth.policy?.unknownIsBlocked !== true) fail("Unknown sources must remain blocked");
if (auth.policy?.trainingPermissionRequired !== true) fail("Training permission must be required");
if (auth.policy?.evidenceRequired !== true) fail("Authorization evidence must be required");
if (ingestion.policy?.productionTrainingRequiresExplicitPromotion !== true) fail("Production promotion must be explicit");
if (ingestion.policy?.candidateSourcesRemainBlocked !== true) fail("Candidate sources must remain blocked");

const eligible = auth.sources.filter((source) =>
  source.status === "eligible" &&
  source.trainingPermission === "verified" &&
  source.derivativeModelPermission === "verified" &&
  Boolean(source.evidenceRef)
);

const productionSources = ingestion.sources.filter((source) => source.productionTrainingEligible === true);
const blockedCandidates = candidates.sources.filter((source) => source.status === "review-required" || source.trainingEligible === false);

if (productionSources.length > 0) {
  const authIds = new Set(eligible.map((source) => source.authorizationId));
  for (const source of productionSources) {
    if (!authIds.has(source.authorizationId)) fail(`Production source lacks verified authorization: ${source.sourceId}`);
  }
}

const requireProduction = process.argv.includes("--require-production");
if (requireProduction && productionSources.length === 0) {
  fail("TRAINING PROMOTION BLOCKED: no explicitly promoted production corpus exists. Add independently verified authorization, provenance, privacy, safety, quality, deduplication, and content-hash evidence before promotion.");
}

console.log(`Fresh training promotion gate: PASS (${eligible.length} verified authorization record(s))`);
console.log(`productionSources=${productionSources.length}`);
console.log(`blockedCandidates=${blockedCandidates.length}`);
if (productionSources.length === 0) {
  console.log("productionTraining=BLOCKED_BY_DESIGN");
  console.log("No real training promotion is authorized yet; the current repository remains safe from accidental starter-corpus promotion.");
} else {
  console.log("productionTraining=EXPLICITLY_PROMOTED");
}
