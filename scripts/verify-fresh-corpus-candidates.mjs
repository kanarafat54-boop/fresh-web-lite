import fs from "node:fs";
import path from "node:path";

const file = path.resolve("training/fresh_corpus_candidates.json");
const authFile = path.resolve("training/fresh_corpus_authorizations.json");
const registry = JSON.parse(fs.readFileSync(file, "utf8"));
const authorizationRegistry = JSON.parse(fs.readFileSync(authFile, "utf8"));

if (registry.schema !== "fresh-corpus-candidate-registry-v1") {
  throw new Error("Invalid Fresh corpus candidate registry schema");
}
if (registry.policy?.candidateSourcesAreBlockedByDefault !== true) {
  throw new Error("Candidate sources must be blocked by default");
}
if (registry.policy?.eligibilityRequiresAuthorizationRegistryEntry !== true) {
  throw new Error("Candidate eligibility must require an authorization registry entry");
}
if (registry.policy?.legalReviewRequiredBeforeEligibility !== true) {
  throw new Error("Legal review must be required before candidate eligibility");
}
if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
  throw new Error("Candidate registry must contain sources");
}

const ids = new Set();
for (const source of registry.sources) {
  if (!source.candidateId || ids.has(source.candidateId)) {
    throw new Error("Candidate IDs must be present and unique");
  }
  ids.add(source.candidateId);
  if (!Array.isArray(source.evidenceRefs) || source.evidenceRefs.length === 0) {
    throw new Error(`Candidate ${source.candidateId} requires evidence references`);
  }
  if (source.status === "review-required") {
    if (source.trainingEligible !== false) {
      throw new Error(`Review-required candidate ${source.candidateId} must remain blocked`);
    }
    continue;
  }
  if (source.status !== "eligible" || source.trainingEligible !== true) {
    throw new Error(`Candidate ${source.candidateId} has an invalid eligibility state`);
  }
  const authorization = authorizationRegistry.sources.find((item) => item.candidateId === source.candidateId);
  if (!authorization || authorization.status !== "eligible") {
    throw new Error(`Eligible candidate ${source.candidateId} requires a matching eligible authorization record`);
  }
  for (const key of ["trainingPermission", "commercialTrainingPermission", "derivativeModelPermission"]) {
    if (authorization[key] !== "verified") throw new Error(`Eligible candidate ${source.candidateId} lacks verified ${key}`);
  }
  if (authorization.license !== source.license || !authorization.evidenceRef) {
    throw new Error(`Eligible candidate ${source.candidateId} has missing/mismatched license evidence`);
  }
  if (!source.evidenceRefs.includes(authorization.sourceLicenseEvidenceRef)) {
    throw new Error(`Eligible candidate ${source.candidateId} must reference its source license evidence`);
  }
  for (const review of ["rights", "privacy", "safety", "quality"]) {
    if (source.reviews?.[review] !== "passed") throw new Error(`Eligible candidate ${source.candidateId} requires passed ${review} review`);
  }
}

const blockedCount = registry.sources.filter((source) => source.status === "review-required").length;
const eligibleCount = registry.sources.filter((source) => source.status === "eligible").length;
console.log(`Fresh corpus candidate registry: PASS (${blockedCount} blocked, ${eligibleCount} explicitly authorized)`);
console.log("Candidate sources remain blocked until matching authorization, rights, privacy, safety, and quality reviews pass.");
