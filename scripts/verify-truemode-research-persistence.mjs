import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");

const orchestrator = read("src/core/semantic/truthDecisionOrchestrator.ts");
const calibration = read("src/core/semantic/confidenceCalibration.ts");
const temporal = read("src/core/semantic/temporalTruth.ts");
const persistenceContract = read("src/core/semantic/semanticPersistence.ts");
const persistence = read("src/core/semantic/supabaseSemanticPersistence.ts");
const atomicMigration = read("supabase/migrations/20261014120128_atomic_truemode_research_persistence.sql");
const researchPersistence = read("src/server/research/persistSemanticResearchV2.ts");
const researchRoute = read("api/research/search.ts");
const truthMigration = read("supabase/migrations/20260906100752_fresh_intelligence_truth_decisions.sql");
const aiGateway = read("src/core/fresh-ai/FreshAIIntelligenceGateway.ts");
const aiKernel = read("src/core/fresh-ai/FreshAIKernel.ts");
const agentRuntime = read("src/core/ara6/agents/agentRuntime.ts");

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
  [persistence, "persist_fresh_intelligence_research_graph", "Supabase adapter must use the atomic research RPC."],
  [persistence, "p_batch_key: input.batchKey", "Supabase persistence must pass an idempotency key."],
  [atomicMigration, "create or replace function public.persist_fresh_intelligence_research_graph", "Database migration must provide the atomic persistence function."],
  [atomicMigration, "fresh_intelligence_persistence_batches", "Database migration must persist batch idempotency keys."],
  [persistence, "SUPABASE_SERVICE_ROLE_KEY", "Supabase persistence must remain server-only."],
  [researchPersistence, "decideTruthBatch", "Research persistence must cross the truth decision boundary."],
  [researchPersistence, "const provenanceNodes: ProvenanceNode[]", "Research persistence must build provenance nodes from persisted sources."],
  [researchPersistence, "decideTruthBatch(claims, evidence, provenanceNodes, [], researchedAt)", "Truth decisions must consume the research provenance graph inputs."],
  [researchPersistence, "createSupabaseSemanticPersistence", "Research persistence must use the Supabase adapter."],
  [researchPersistence, "dryRun", "Research persistence must support a safe dry-run path."],
  [researchRoute, "persistSemanticResearch", "Research API must invoke semantic persistence."],
  [researchRoute, "PERSISTENCE_DRY_RUN", "Research API must expose a deployment-safe persistence switch."],
  [truthMigration, "fresh_intelligence_truth_decisions", "Supabase migration must define the truth-decision ledger."],
  [aiGateway, "blockedTruth=truthDecisions.filter", "Fresh AI execution must consume the canonical TRUEMODE decisions."],
  [aiGateway, "TRUEMODE blocked execution", "Fresh AI must fail closed when TRUEMODE blocks an evidence claim."],
  [aiKernel, "truthDecisions", "The execution kernel must require TRUEMODE decisions."],
  [aiKernel, "TRUEMODE decision evidence is required before execution", "The execution kernel must fail closed without TRUEMODE evidence."],
];

for (const [source, needle, message] of required) {
  if (!source.includes(needle)) throw new Error(message + " Missing: " + needle);
}

const kernelTruthGate = aiKernel.indexOf("TRUEMODE decision evidence is required before execution");
if (kernelTruthGate < 0 || aiKernel.indexOf("executeFreshPlanThroughAra6", kernelTruthGate) < kernelTruthGate) throw new Error("Execution kernel must enforce TRUEMODE before ARA6 execution.");

const truthDecisionIndex = aiGateway.indexOf("const blockedTruth=truthDecisions.filter");
const executionIndex = aiGateway.indexOf("this.kernel.execute", truthDecisionIndex);
if (truthDecisionIndex < 0 || executionIndex < 0 || truthDecisionIndex > executionIndex) throw new Error("TRUEMODE execution gate must run before any plan execution.");

if (researchPersistence.includes('"../../src/core/')) {
  throw new Error("Research persistence contains invalid src/src relative imports.");
}
if (!researchPersistence.includes('from "../../core/semantic/supabaseSemanticPersistence.js"')) {
  throw new Error("Research persistence must import the server-only Supabase adapter from the correct relative path.");
}

const researchApi = read("api/research/search.ts");
if (researchApi.includes("proof: { provenance:") || researchApi.includes("maxDimension: 11")) {
  throw new Error("Public research API must not expose internal reasoning architecture metadata.");
}

if (!researchApi.includes("intelligencePersisted: !dryRun && Boolean(persistence) && !persistenceWarning") || !researchApi.includes("if (persistenceTimeout) clearTimeout(persistenceTimeout)")) {
  throw new Error("Research API must only report persistence after a successful completed write and must clear its timeout.");
}

if (!researchApi.includes('typeof body.query === "string"') ||
    !researchApi.includes("query.length > 2_000") ||
    !researchApi.includes("Object.prototype.hasOwnProperty.call(MODE_CONFIG, requestedMode)") ||
    !researchApi.includes("Number.isFinite(body.maxSources)") ||
    !researchApi.includes("Array.isArray(body.context)")) {
  throw new Error("Research API must validate query, mode, source limit, and context before invoking providers.");
}

const researchOrchestrator = read("src/server/research/orchestrator.ts");
const researchPersistenceBridge = read("src/server/research/persistSemanticResearchV2.ts");
if (!researchPersistenceBridge.includes('"research-claim-" + queryScope + "-" + hash(finding.id)') ||
    !researchPersistenceBridge.includes("const queryScope = hash(normalizeResearchQuery(result.query))") ||
    !researchPersistenceBridge.includes("function normalizeResearchQuery(value: string)") ||
    !researchPersistenceBridge.includes('.replace(/\\s+/g, " ")')) {
  throw new Error("Persisted research identities must use canonicalized query scope to prevent inconsistent IDs and cross-query overwrites.");
}
if (!researchPersistenceBridge.includes("findingIdByClaimId.get(claim.id)")) {
  throw new Error("Claim evidence lookup must preserve source mapping after query-scoped claim IDs are assigned.");
}
if (researchOrchestrator.includes('"../../src/core/')) {
  throw new Error("Research orchestrator contains invalid src/src relative imports.");
}
if (!researchOrchestrator.includes('from "../../core/research/contracts.js"') ||
    !researchOrchestrator.includes('from "../../core/semantic/claimIntelligence.js"')) {
  throw new Error("Research orchestrator must import core modules using correct relative paths.");
}
if (!persistence.includes("observed_at: observedAt")) {
  throw new Error("Claim relation persistence must include the observed_at timestamp.");
}

console.log("TRUEMODE research → truth decision → Supabase contract: PASS");
console.log("Claims, evidence, independence, provenance, confidence calibration, temporal truth, decision boundary, and persistence wiring are present.");

assert(agentRuntime.includes("TRUEMODE decision evidence is required before ARA6 tool execution"), "ARA6 runtime must fail closed without TRUEMODE evidence");
assert(agentRuntime.includes('decision.decision === "BLOCK_ACTION"'), "ARA6 runtime must reject blocked TRUEMODE decisions");
