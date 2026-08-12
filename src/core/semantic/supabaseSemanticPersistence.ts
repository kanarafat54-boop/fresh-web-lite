import { createClient } from "@supabase/supabase-js";
import type { SemanticClaim, SemanticEvidence } from "./types";
import type { SemanticPersistence } from "./semanticPersistence";

type PersistenceInput = Parameters<SemanticPersistence["persistResearchGraph"]>[0];

/** Server-only adapter. Never import this module into browser components. */
export function createSupabaseSemanticPersistence(): SemanticPersistence {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Missing server Supabase environment variables.");
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    async persistResearchGraph(input: PersistenceInput) {
      if (input.entities.length) {
        const { error } = await client.from("fresh_intelligence_entities").upsert(input.entities.map((e) => ({ id: e.id, entity_type: e.entityType, label: e.label, attributes: e.attributes ?? [], updated_at: new Date().toISOString() })), { onConflict: "id" });
        if (error) throw error;
      }
      if (input.sources.length) {
        const { error } = await client.from("fresh_intelligence_sources").upsert(input.sources.map((s) => ({ id: s.id, provider: s.provider, name: s.name ?? null, url: s.url ?? null, reliability: s.reliability ?? null, metadata: s.metadata ?? {} })), { onConflict: "id" });
        if (error) throw error;
      }
      if (input.claims.length) {
        const { error } = await client.from("fresh_intelligence_claims").upsert(input.claims.map((c) => ({ id: c.id, subject_entity_id: c.subjectEntityId ?? null, predicate: c.predicate, object: c.object, normalized_text: c.statement, status: c.status, confidence: c.confidence, first_observed_at: c.firstObservedAt, last_observed_at: c.lastObservedAt, valid_from: c.validFrom ?? null, valid_to: c.validTo ?? null, updated_at: new Date().toISOString() })), { onConflict: "id" });
        if (error) throw error;
      }
      if (input.evidence.length) {
        const { error } = await client.from("fresh_intelligence_evidence").upsert(input.evidence.map((e) => ({ id: e.id, claim_text: e.claimText, source_url: e.sourceUrl, source_title: e.sourceTitle ?? null, provider: e.provider, observed_at: e.observedAt, published_at: e.publishedAt ?? null, confidence: e.confidence ?? null, supports: e.supports ?? null })), { onConflict: "id" });
        if (error) throw error;
      }
      if (input.claimEvidence.length) {
        const { error } = await client.from("fresh_intelligence_claim_evidence").upsert(input.claimEvidence.map((r) => ({ claim_id: r.claimId, evidence_id: r.evidenceId, stance: r.stance, stance_confidence: r.stanceConfidence ?? null })), { onConflict: "claim_id,evidence_id" });
        if (error) throw error;
      }
      if (input.relations.length) {
        const { error } = await client.from("fresh_intelligence_claim_relations").upsert(input.relations.map((r) => ({ left_claim_id: r.leftClaimId, right_claim_id: r.rightClaimId, relation: r.relation, confidence: r.confidence, rationale: r.rationale ?? null })), { onConflict: "left_claim_id,right_claim_id,relation" });
        if (error) throw error;
      }
      if (input.arbitrations.length) {
        const { error } = await client.from("fresh_intelligence_arbitrations").insert(input.arbitrations.map((a) => ({ left_claim_id: a.leftClaimId, right_claim_id: a.rightClaimId, decision: a.decision, confidence: a.confidence, rationale: a.rationale, requires_human_review: a.requiresHumanReview ?? false, retained_claim_ids: a.retainedClaimIds ?? [], superseded_claim_ids: a.supersededClaimIds ?? [] })));
        if (error) throw error;
      }
    },
  };
}
