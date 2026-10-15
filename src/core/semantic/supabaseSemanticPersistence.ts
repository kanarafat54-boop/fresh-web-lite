import { getServerEnv } from "../platform/serverEnv.js";
import { createClient } from "@supabase/supabase-js";
import type { SemanticPersistence } from "./semanticPersistence.js";

type PersistenceInput = Parameters<SemanticPersistence["persistResearchGraph"]>[0];
type RpcClient = { rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }> };

/** Validate the JSON contract returned by the atomic database function. */
export function assertResearchPersistenceRpcResult(data: unknown): void {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("TRUEMODE persistence RPC returned no result; persistence status is unknown.");
  }
  const result = data as { persisted?: unknown; alreadyPersisted?: unknown; summary?: unknown };
  if (result.persisted !== true && result.alreadyPersisted !== true) {
    throw new Error("TRUEMODE persistence RPC did not confirm a new or previously persisted batch.");
  }
  if (!result.summary || typeof result.summary !== "object" || Array.isArray(result.summary)) {
    throw new Error("TRUEMODE persistence RPC did not return a batch summary.");
  }
  const summary = result.summary as Record<string, unknown>;
  for (const key of ["entities", "sources", "claims", "evidence", "claimEvidence", "relations", "arbitrations", "truthDecisions"]) {
    if (!Number.isInteger(summary[key]) || (summary[key] as number) < 0) {
      throw new Error(`TRUEMODE persistence RPC returned an invalid ${key} summary count.`);
    }
  }
}

/** Server-only adapter. Never import this module into browser components. */
export function createSupabaseSemanticPersistence(): SemanticPersistence {
  const url = getServerEnv("SUPABASE_URL");
  const serviceRoleKey = getServerEnv("SUPABASE_SECRET_KEY_FRESHWEBLITE") || getServerEnv("SUPABASE_SECRET_KEY") || getServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Missing server Supabase environment variables.");
  const browserUrl = getServerEnv("VITE_SUPABASE_URL");
  if (browserUrl && new URL(browserUrl).hostname !== new URL(url).hostname) {
    throw new Error("Server Supabase URL does not match the browser Supabase project. Align SUPABASE_URL and its server secret key.");
  }
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return createSemanticPersistenceFromRpcClient(client as unknown as RpcClient);
}

/** Internal dependency seam for deterministic RPC contract tests; production passes the authenticated Supabase client. */
export function createSemanticPersistenceFromRpcClient(client: RpcClient): SemanticPersistence {
  return {
    async persistResearchGraph(input: PersistenceInput) {
      const observedAt = new Date().toISOString();
      const sourceIdByUrl = new Map<string, string>();
      for (const source of input.sources) if (source.url) sourceIdByUrl.set(source.url, source.id);
      const payload = {
        entities: input.entities.map((entity) => ({ id: entity.id, entity_type: entity.entityType, label: entity.label, attributes: entity.attributes ?? [], updated_at: observedAt })),
        sources: input.sources.map((source) => ({ id: source.id, provider: source.provider, name: source.name ?? null, url: source.url ?? null, reliability: source.reliability ?? null, metadata: source.metadata ?? {} })),
        claims: input.claims.map((claim) => ({ id: claim.id, subject_entity_id: claim.subjectEntityId ?? null, predicate: claim.predicate, object: claim.object, normalized_text: claim.normalizedText, status: claim.status, confidence: claim.confidence, first_observed_at: claim.firstObservedAt, last_observed_at: claim.lastObservedAt, valid_from: claim.validFrom ?? null, valid_to: claim.validTo ?? null, updated_at: observedAt })),
        evidence: input.evidence.map((evidence) => ({ id: evidence.id, claim_text: evidence.claim, source_id: evidence.sourceId ?? sourceIdByUrl.get(evidence.sourceUrl) ?? null, source_url: evidence.sourceUrl, source_title: evidence.sourceTitle ?? null, provider: evidence.provider, observed_at: evidence.observedAt, published_at: evidence.publishedAt ?? null, confidence: evidence.confidence ?? null, supports: evidence.supports ?? null })),
        claim_evidence: input.claimEvidence.map((relation) => ({ claim_id: relation.claimId, evidence_id: relation.evidenceId, stance: relation.stance, stance_confidence: relation.stanceConfidence ?? null })),
        relations: input.relations.map((relation) => ({ left_claim_id: relation.leftClaimId, right_claim_id: relation.rightClaimId, relation: relation.relation, confidence: relation.confidence, rationale: relation.rationale ?? null, observed_at: observedAt })),
        arbitrations: input.arbitrations.map((arbitration) => ({ left_claim_id: arbitration.leftClaimId, right_claim_id: arbitration.rightClaimId, decision: arbitration.decision, confidence: arbitration.confidence, rationale: arbitration.rationale, requires_human_review: arbitration.requiresHumanReview ?? false, retained_claim_ids: arbitration.retainedClaimIds ?? [], superseded_claim_ids: arbitration.supersededClaimIds ?? [] })),
        truth_decisions: input.truthDecisions.map((decision) => ({ claim_id: decision.claimId, decision: decision.decision, actionable: decision.actionable, calibrated_confidence: decision.calibration.confidence, temporal_status: decision.assessment.status, reasons: decision.reasons, assessed_at: decision.calibration.assessedAt })),
      };
      // One database function means all graph writes commit or roll back together.
      const { data, error } = await client.rpc("persist_fresh_intelligence_research_graph", { p_batch_key: input.batchKey, p_payload: payload });
      if (error) throw new Error(error.message || "Supabase TRUEMODE persistence RPC failed.");
      assertResearchPersistenceRpcResult(data);
    },
  };
}
