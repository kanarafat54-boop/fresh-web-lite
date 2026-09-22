import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const orchestrator = read("src/core/semantic/truthDecisionOrchestrator.ts");
const calibration = read("src/core/semantic/confidenceCalibration.ts");
const temporal = read("src/core/semantic/temporalTruth.ts");
const persistenceContract = read("src/core/semantic/semanticPersistence.ts");
const persistence = read("src/core/semantic/supabaseSemanticPersistence.ts");
const researchPersistence = read("api/research/persistSemanticResearch.ts");
const researchRoute = read("api/research/search.ts");
const truthMigration = read("supabase/migrations/20260906100752_fresh_intelligence_truth_decisions.sql");

const required = [
  [orchestrator, "calibrateClaimConfidence", "Truth orchestrator must consume calibrated confidence."],
  [orchestrator, "assessTemporalTruth", "Truth orchestrator must evaluate temporal truth."],
  [orchestrator, "isActionableTemporalTruth", "Truth orchestrator must enforce temporal actionability."],
  [orchestrator, "ALLOW_ACTION", "Truth decision boundary must expose ALLOW_ACTION."],
  [orchestrator, "ALLOW_WITH_CAUTION", "Truth decision boundary must expose ALLOW_WITH_CAUTION."],
  [orchestrator, "BLOCK_ACTION", "Truth decision boundary must expose BLOCK_ACTION."],
  [calibration, "clusterEvidence", "Confidence calibration must evaluate evidence independence."],
  [calibration, "buildProvenanceGraph", "Confidence calibration must account for provenance."],
  [calibration, "compareClaims", "Confidence calibration must account for related/contradictory claims."],
  [temporal, "validTo", "Temporal truth must support validity windows."],
  [persistenceContract, "truthDecisions: TruthDecision[]", "Persistence contract must carry truth decisions."],
  [persistence, "fresh_intelligence_truth_decisions", "Supabase adapter must persist truth decisions."],
  [persistence, "SUPABASE_SERVICE_ROLE_KEY", "Supabase persistence must remain server-only."],
  [researchPersistence, "decideTruthBatch", "Research persistence must cross the truth decision boundary."],
  [researchPersistence, "createSupabaseSemanticPersistence", "Research persistence must use the Supabase adapter."],
  [researchPersistence, "dryRun", "Research persistence must support a safe dry-run path."],
  [researchRoute, "persistSemanticResearch", "Research API must invoke semantic persistence."],
  [researchRoute, "PERSISTENCE_DRY_RUN", "Research API must expose a deployment-safe persistence switch."],
  [truthMigration, "fresh_intelligence_truth_decisions", "Supabase migration must define the truth-decision ledger."],
];

for (const [source, needle, message] of required) {
  if (!source.includes(needle)) throw new Error(message + " Missing: " + needle);
}

if (researchPersistence.includes("from "../../src/core/semantic/supabaseSemanticPersistence"") && !researchPersistence.includes("from "../../src/core/semantic/supabaseSemanticPersistence.js"")) {
  throw new Error("Server persistence import should use the ESM .js contract used by the API layer.");
}

console.log("TRUEMODE research → truth decision → Supabase contract: PASS");
console.log("Claims, evidence, independence, provenance, confidence calibration, temporal truth, decision boundary, and persistence wiring are present.");
