import { createSupabaseSemanticPersistence } from "../../src/core/semantic/supabaseSemanticPersistence";
import type { SemanticClaim, SemanticEvidence } from "../../src/core/semantic/types";
import type { ResearchResult } from "../../src/core/research/contracts";

/**
 * Converts the trusted research boundary into the durable Fresh Intelligence graph.
 * This module is server-only: it uses SUPABASE_SERVICE_ROLE_KEY indirectly through
 * createSupabaseSemanticPersistence and must never be imported by browser code.
 */
export async function persistSemanticResearch(result: ResearchResult): Promise<void> {
  const evidence: SemanticEvidence[] = result.sources.map((source, index) => ({
    id: `research-evidence-${hash(`${result.query}:${source.url}:${index}`)}`,
    claim: source.snippet ?? source.title,
    sourceUrl: source.url,
    sourceTitle: source.title,
    provider: source.provider,
    observedAt: result.researchedAt,
    publishedAt: source.publishedAt,
    confidence: source.snippet ? 0.6 : 0.35,
  }));

  const evidenceByUrl = new Map(result.sources.map((source, index) => [source.url, evidence[index]]));
  const claims: SemanticClaim[] = result.claims.map((claim) => {
    const ids = claim.sourceUrls.map((url) => evidenceByUrl.get(url)?.id).filter((id): id is string => Boolean(id));
    return {
      id: claim.id,
      predicate: "research_finding",
      object: claim.text,
      normalizedText: claim.text.toLocaleLowerCase().normalize("NFKC").trim(),
      status: claim.status === "supported" ? "supported" : "uncertain",
      confidence: claim.confidence,
      firstObservedAt: result.researchedAt,
      lastObservedAt: result.researchedAt,
      evidenceIds: ids,
      counterEvidenceIds: [],
    };
  });

  const claimEvidence = claims.flatMap((claim) => claim.evidenceIds.map((evidenceId) => ({
    claimId: claim.id,
    evidenceId,
    stance: "uncertain" as const,
    stanceConfidence: 0,
  })));

  const entities = claims.map((claim) => ({ id: `research-claim-entity-${hash(claim.id)}`, entityType: "concept", label: claim.object, attributes: [] }));
  const claimsWithEntities = claims.map((claim) => ({ ...claim, subjectEntityId: `research-claim-entity-${hash(claim.id)}` }));

  const sources = result.sources.map((source) => ({
    id: `research-source-${hash(source.url)}`,
    provider: source.provider,
    name: source.title,
    url: source.url,
    metadata: { publishedAt: source.publishedAt },
  }));

  await createSupabaseSemanticPersistence().persistResearchGraph({
    entities,
    sources,
    claims: claimsWithEntities,
    evidence,
    claimEvidence,
    relations: [],
    arbitrations: [],
  });
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
