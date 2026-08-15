import { createSupabaseSemanticPersistence } from "../../src/core/semantic/supabaseSemanticPersistence.js";
import { assessEvidenceStance } from "../../src/core/semantic/evidenceStance.js";
import { assessClaimConfidence } from "../../src/core/semantic/claimConfidence.js";
import { arbitrateClaimSet } from "../../src/core/semantic/beliefArbitration.js";
import { compareClaims, type Claim } from "../../src/core/semantic/claimIntelligence.js";
import type { SemanticClaim, SemanticEvidence } from "../../src/core/semantic/types.js";
import type { ResearchResult } from "../../src/core/research/contracts.js";

type PersistenceSummary = { entities: number; sources: number; claims: number; evidence: number; claimEvidence: number; relations: number; arbitrations: number; dryRun: boolean };
type PersistenceOptions = { dryRun?: boolean; runId?: string };

function logStage(runId: string | undefined, stage: string, details: Record<string, unknown> = {}): void {
  console.info("TRUEMODE", { runId, stage, ...details });
}

/** Server-only bridge: research -> claim intelligence -> durable semantic graph. */
export async function persistSemanticResearch(result: ResearchResult, options: PersistenceOptions = {}): Promise<PersistenceSummary> {
  const runId = options.runId;
  const researchedAt = result.researchedAt;
  const sources = result.sources.map((source) => ({ id: `research-source-${hash(source.url)}`, provider: source.provider, name: source.title, url: source.url, metadata: { publishedAt: source.publishedAt } }));
  const sourceIdByUrl = new Map(sources.filter((s) => s.url).map((s) => [s.url as string, s.id]));
  const evidence: SemanticEvidence[] = result.sources.map((source, index) => ({
    id: `research-evidence-${hash(`${result.query}:${source.url}:${index}`)}`,
    claim: source.snippet ?? source.title,
    sourceUrl: source.url,
    sourceTitle: source.title,
    provider: source.provider,
    sourceId: sourceIdByUrl.get(source.url),
    observedAt: researchedAt,
    publishedAt: source.publishedAt,
    confidence: source.snippet ? 0.6 : 0.35,
  }));

  const subjectEntityId = `research-subject-${hash(result.query)}`;
  const claims: SemanticClaim[] = result.claims.map((finding) => ({
    id: finding.id,
    subjectEntityId,
    predicate: "research_finding",
    object: finding.text,
    normalizedText: finding.text.toLocaleLowerCase().normalize("NFKC").trim(),
    status: finding.status === "conflicted" ? "contested" : finding.status === "supported" ? "supported" : "uncertain",
    confidence: finding.confidence,
    firstObservedAt: researchedAt,
    lastObservedAt: researchedAt,
    evidenceIds: [],
    counterEvidenceIds: [],
  }));

  const evidenceByUrl = new Map(result.sources.map((source, index) => [source.url, evidence[index]]));
  for (const claim of claims) {
    const related = result.claims.find((finding) => finding.id === claim.id)?.sourceUrls.map((url) => evidenceByUrl.get(url)).filter((item): item is SemanticEvidence => Boolean(item)) ?? [];
    const claimModel: Claim = { id: claim.id, subjectEntityId, predicate: claim.predicate, object: String(claim.object), statement: String(claim.object), normalizedStatement: claim.normalizedText, observedAt: researchedAt, confidence: claim.confidence };
    const stances = related.map((item) => assessEvidenceStance(claimModel, item));
    claim.evidenceIds = stances.filter((s) => s.stance === "supports").map((s) => s.evidenceId);
    claim.counterEvidenceIds = stances.filter((s) => s.stance === "contradicts").map((s) => s.evidenceId);
    const assessment = assessClaimConfidence(claim, related, new Map(), researchedAt);
    claim.confidence = assessment.confidence;
    claim.status = assessment.counterEvidenceIds.length && assessment.supportingEvidenceIds.length ? "contested" : assessment.supportingEvidenceIds.length ? "supported" : "uncertain";
  }

  const claimEvidence = claims.flatMap((claim) => {
    const all = [...claim.evidenceIds, ...claim.counterEvidenceIds];
    return all.map((evidenceId) => {
      const claimModel: Claim = { id: claim.id, subjectEntityId, predicate: claim.predicate, object: String(claim.object), statement: String(claim.object), normalizedStatement: claim.normalizedText, observedAt: researchedAt, confidence: claim.confidence };
      const evidenceItem = evidence.find((item) => item.id === evidenceId)!;
      const stance = assessEvidenceStance(claimModel, evidenceItem);
      return { claimId: claim.id, evidenceId, stance: stance.stance, stanceConfidence: stance.confidence };
    });
  });

  const relations: Array<{ leftClaimId: string; rightClaimId: string; relation: "same" | "supports" | "contradicts" | "unrelated" | "conditional_contradiction"; confidence: number; rationale?: string }> = [];
  for (let i = 0; i < claims.length; i += 1) for (let j = i + 1; j < claims.length; j += 1) {
    const left: Claim = { id: claims[i].id, subjectEntityId, predicate: claims[i].predicate, object: String(claims[i].object), statement: String(claims[i].object), normalizedStatement: claims[i].normalizedText, observedAt: researchedAt, confidence: claims[i].confidence };
    const right: Claim = { id: claims[j].id, subjectEntityId, predicate: claims[j].predicate, object: String(claims[j].object), statement: String(claims[j].object), normalizedStatement: claims[j].normalizedText, observedAt: researchedAt, confidence: claims[j].confidence };
    const comparison = compareClaims(left, right);
    relations.push({ leftClaimId: left.id, rightClaimId: right.id, relation: comparison.relation === "supporting" ? "supports" : comparison.relation === "contradictory" ? "contradicts" : comparison.relation, confidence: comparison.confidence, rationale: comparison.rationale });
  }

  const arbitrations = arbitrateClaimSet(claims, evidence, new Map(), researchedAt).map((decision) => ({
    leftClaimId: decision.leftClaimId,
    rightClaimId: decision.rightClaimId,
    decision: decision.decision,
    confidence: decision.confidence,
    rationale: decision.rationale,
    requiresHumanReview: decision.requiresHumanReview,
    retainedClaimIds: decision.retainedClaimIds,
    supersededClaimIds: decision.supersededClaimIds,
  }));

  const entities = [{ id: subjectEntityId, entityType: "concept", label: result.query, attributes: [{ key: "mode", value: result.mode, source: "web", confidence: 1, observedAt: researchedAt }] }];
  const summary: PersistenceSummary = { entities: entities.length, sources: sources.length, claims: claims.length, evidence: evidence.length, claimEvidence: claimEvidence.length, relations: relations.length, arbitrations: arbitrations.length, dryRun: Boolean(options.dryRun) };
  logStage(runId, "research.persistence.prepared", summary);
  if (options.dryRun) return summary;

  await createSupabaseSemanticPersistence().persistResearchGraph({ entities, sources, claims, evidence, claimEvidence, relations, arbitrations });
  logStage(runId, "research.persistence.supabase.complete", summary);
  return summary;
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
