import fs from "node:fs";
import path from "node:path";

const file = path.resolve("training/fresh_corpus_candidates.json");
const registry = JSON.parse(fs.readFileSync(file, "utf8"));

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
  if (source.status !== "review-required") {
    throw new Error(`Candidate ${source.candidateId} must remain review-required`);
  }
  if (source.trainingEligible !== false) {
    throw new Error(`Candidate ${source.candidateId} must not be training-eligible before authorization`);
  }
  if (!Array.isArray(source.evidenceRefs) || source.evidenceRefs.length === 0) {
    throw new Error(`Candidate ${source.candidateId} requires evidence references`);
  }
}

console.log(`Fresh corpus candidate registry: PASS (${registry.sources.length} blocked candidates)`);
console.log("Candidate sources remain blocked until authorization and legal review are verified.");
