import { getServerEnv } from "../platform/serverEnv.js";
import { createClient } from "@supabase/supabase-js";
import type { SemanticPersistence } from "./semanticPersistence.js";

type PersistenceInput = Parameters<SemanticPersistence["persistResearchGraph"]>[0];

/** Server-only adapter. Never import this module into browser components. */
export function createSupabaseSemanticPersistence(): SemanticPersistence {
  const url = getServerEnv("SUPABASE_URL");
  const serviceRoleKey = getServerEnv("SUPABASE_SECRET_KEY") || getServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Missing server Supabase environment variables.");
  // Safe diagnostics only: log host/project references, never credentials or full URLs.
  const keyMetadata = (value: string | null | undefined): { present: boolean; kind?: string; projectRef?: string; role?: string } => {
    if (!value) return { present: false };
    const parts = value.split(".");
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { ref?: unknown; role?: unknown };
        return { present: true, kind: "jwt", ...(typeof payload.ref === "string" ? { projectRef: payload.ref } : {}), ...(typeof payload.role === "string" ? { role: payload.role } : {}) };
      } catch { /* opaque key */ }
    }
    return { present: true, kind: value.startsWith("sb_secret_") ? "supabase-secret" : "opaque" };
  };
  const hostOf = (value: string | null | undefined) => { try { return value ? new URL(value).hostname : null; } catch { return null; } };
  console.info("Fresh Intelligence persistence target", {
    host: new URL(url).hostname,
    browserHost: hostOf(getServerEnv("VITE_SUPABASE_URL")),
    primaryKey: keyMetadata(getServerEnv("SUPABASE_SECRET_KEY")),
    legacyKey: keyMetadata(getServerEnv("SUPABASE_SERVICE_ROLE_KEY")),
  });

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async persistResearchGraph(input: PersistenceInput) {
      if (input.entities.length) {
        const rows = input.entities.map((entity) => ({ id: entity.id, entity_type: entity.entityType, label: entity.label, attributes: entity.attributes ?? [], updated_at: new Date().toISOString() }));
        const { error } = await client.from("fresh_intelligence_entities").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      if (input.sources.length) {
        const rows = input.sources.map((source) => ({ id: source.id, provider: source.provider, name: source.name ?? null, url: source.url ?? null, reliability: source.reliability ?? null, metadata: source.metadata ?? {} }));
        const { error } = await client.from("fresh_intelligence_sources").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      if (input.claims.length) {
        const rows = input.claims.map((claim) => ({ id: claim.id, subject_entity_id: claim.subjectEntityId ?? null, predicate: claim.predicate, object: claim.object, normalized_text: claim.normalizedText, status: claim.status, confidence: claim.confidence, first_observed_at: claim.firstObservedAt, last_observed_at: claim.lastObservedAt, valid_from: claim.validFrom ?? null, valid_to: claim.validTo ?? null, updated_at: new Date().toISOString() }));
        const { error } = await client.from("fresh_intelligence_claims").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      if (input.evidence.length) {
        const sourceIdByUrl = new Map<string, string>();
        for (const source of input.sources) if (source.url) sourceIdByUrl.set(source.url, source.id);
        const rows = input.evidence.map((evidence) => ({ id: evidence.id, claim_text: evidence.claim, source_id: evidence.sourceId ?? sourceIdByUrl.get(evidence.sourceUrl) ?? null, source_url: evidence.sourceUrl, source_title: evidence.sourceTitle ?? null, provider: evidence.provider, observed_at: evidence.observedAt, published_at: evidence.publishedAt ?? null, confidence: evidence.confidence ?? null, supports: evidence.supports ?? null }));
        const { error } = await client.from("fresh_intelligence_evidence").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      if (input.claimEvidence.length) {
        const rows = input.claimEvidence.map((relation) => ({ claim_id: relation.claimId, evidence_id: relation.evidenceId, stance: relation.stance, stance_confidence: relation.stanceConfidence ?? null }));
        const { error } = await client.from("fresh_intelligence_claim_evidence").upsert(rows, { onConflict: "claim_id,evidence_id" });
        if (error) throw error;
      }
      if (input.relations.length) {
        const observedAt = new Date().toISOString();
        const rows = input.relations.map((relation) => ({ left_claim_id: relation.leftClaimId, right_claim_id: relation.rightClaimId, relation: relation.relation, confidence: relation.confidence, rationale: relation.rationale ?? null, observed_at: observedAt }));
        const { error } = await client.from("fresh_intelligence_claim_relations").upsert(rows, { onConflict: "left_claim_id,right_claim_id,relation" });
        if (error) throw error;
      }
      if (input.arbitrations.length) {
        const rows = input.arbitrations.map((arbitration) => ({ left_claim_id: arbitration.leftClaimId, right_claim_id: arbitration.rightClaimId, decision: arbitration.decision, confidence: arbitration.confidence, rationale: arbitration.rationale, requires_human_review: arbitration.requiresHumanReview ?? false, retained_claim_ids: arbitration.retainedClaimIds ?? [], superseded_claim_ids: arbitration.supersededClaimIds ?? [] }));
        const { error } = await client.from("fresh_intelligence_arbitrations").insert(rows);
        if (error) throw error;
      }
      if (input.truthDecisions.length) {
        const rows = input.truthDecisions.map((decision) => ({ claim_id: decision.claimId, decision: decision.decision, actionable: decision.actionable, calibrated_confidence: decision.calibration.confidence, temporal_status: decision.assessment.status, reasons: decision.reasons, assessed_at: decision.calibration.assessedAt }));
        const { error } = await client.from("fresh_intelligence_truth_decisions").insert(rows);
        if (error) throw error;
      }
    },
  };
}
