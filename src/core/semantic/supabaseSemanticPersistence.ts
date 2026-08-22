import { createClient } from "@supabase/supabase-js";
import type { SemanticPersistence } from "./semanticPersistence.js";

type PersistenceInput = Parameters<SemanticPersistence["persistResearchGraph"]>[0];

/** Server-only adapter. Never import this module into browser components. */
export function createSupabaseSemanticPersistence(): SemanticPersistence {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Missing server Supabase environment variables.");

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async persistResearchGraph(input: PersistenceInput) {
      if (input.entities.length) {
        const rows = input.entities.map((entity) => ({
          id: entity.id,
          entity_type: entity.entityType,
          label: entity.label,
          attributes: entity.attributes ?? [],
          updated_at: new Date().toISOString(),
        }));
        const { error } = await client.from("fresh_intelligence_entities").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }

      if (input.sources.length) {
        const rows = input.sources.map((source) => ({
          id: source.id,
          provider: source.provider,
          name: source.name ?? null,
          url: source.url ?? null,
          reliability: source.reliability ?? null,
          metadata: source.metadata ?? {},
        }));
        const { error } = await client.from("fresh_intelligence_sources").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }

      if (input.claims.length) {
        const rows = input.claims.map((claim) => ({
          id: claim.id,
          subject_entity_id: claim.subjectEntityId ?? null,
          predicate: claim.predicate,
          object: claim.object,
          normalized_text: claim.normalizedText,
          status: claim.status,
          confidence: claim.confidence,
          first_observed_at: claim.firstObservedAt,
          last_observed_at: claim.lastObservedAt,
          valid_from: claim.validFrom ?? null,
          valid_to: claim.validTo ?? null,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await client.from("fresh_intelligence_claims").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }

      if (input.evidence.length) {
        const sourceIdByUrl = new Map<string, string>();
        for (const source of input.sources) {
          if (source.url) sourceIdByUrl.set(source.url, source.id);
        }
        const rows = input.evidence.map((evidence) => ({
          id: evidence.id,
          claim_text: evidence.claim,
          source_id: evidence.sourceId ?? sourceIdByUrl.get(evidence.sourceUrl) ?? null,
          source_url: evidence.sourceUrl,
          source_title: evidence.sourceTitle ?? null,
          provider: evidence.provider,
          observed_at: evidence.observedAt,
          published_at: evidence.publishedAt ?? null,
          confidence: evidence.confidence ?? null,
          supports: evidence.supports ?? null,
        }));
        const { error } = await client.from("fresh_intelligence_evidence").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }

      if (input.claimEvidence.length) {
        const rows = input.claimEvidence.map((relation) => ({
          claim_id: relation.claimId,
          evidence_id: relation.evidenceId,
          stance: relation.stance,
          stance_confidence: relation.stanceConfidence ?? null,
        }));
        const { error } = await client.from("fresh_intelligence_claim_evidence").upsert(rows, { onConflict: "claim_id,evidence_id" });
        if (error) throw error;
      }

      if (input.relations.length) {
        const rows = input.relations.map((relation) => ({
          left_claim_id: relation.leftClaimId,
          right_claim_id: relation.rightClaimId,
          relation: relation.relation,
          confidence: relation.confidence,
          rationale: relation.rationale ?? null,
        }));
        const { error } = await client.from("fresh_intelligence_claim_relations").upsert(rows, { onConflict: "left_claim_id,right_claim_id,relation" });
        if (error) throw error;
      }

      if (input.arbitrations.length) {
        const rows = input.arbitrations.map((arbitration) => ({
          left_claim_id: arbitration.leftClaimId,
          right_claim_id: arbitration.rightClaimId,
          decision: arbitration.decision,
          confidence: arbitration.confidence,
          rationale: arbitration.rationale,
          requires_human_review: arbitration.requiresHumanReview ?? false,
          retained_claim_ids: arbitration.retainedClaimIds ?? [],
          superseded_claim_ids: arbitration.supersededClaimIds ?? [],
        }));
        const { error } = await client.from("fresh_intelligence_arbitrations").insert(rows);
        if (error) throw error;
      }
    },
  };
}
