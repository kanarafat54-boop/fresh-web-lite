import { semanticStore } from "./semanticStore";
import type { SemanticClaim, SemanticEvidence } from "./types";

export type ClaimRelation = "same" | "supporting" | "contradictory" | "unrelated";
export type Claim = {
  id: string;
  subjectEntityId: string;
  predicate: string;
  object: string;
  statement: string;
  normalizedStatement: string;
  observedAt: string;
  validFrom?: string;
  validTo?: string;
  confidence: number;
};
export type ClaimAssessment = {
  claim: Claim;
  relationToExisting: ClaimRelation;
  similarity: number;
  supportingEvidence: SemanticEvidence[];
  counterEvidence: SemanticEvidence[];
  confidence: number;
  rationale: string;
};

const normalize = (value: string): string => value.toLocaleLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const tokens = (value: string): Set<string> => new Set(normalize(value).split(" ").filter((token) => token.length > 1));
const similarity = (a: string, b: string): number => {
  const left = tokens(a), right = tokens(b); if (!left.size || !right.size) return 0;
  let intersection = 0; for (const token of left) if (right.has(token)) intersection++;
  return intersection / new Set([...left, ...right]).size;
};
const evidenceForClaim = (statement: string): SemanticEvidence[] => semanticStore.getEvidence().filter((item) => similarity(item.claim, statement) >= 0.35);
const evidenceBalance = (supporting: SemanticEvidence[], counter: SemanticEvidence[]): number => {
  const total = supporting.length + counter.length; return total === 0 ? 0 : (supporting.length - counter.length) / total;
};
const oppositePredicate = (predicate: string): string | undefined => ({
  "is": "is_not", "exists": "does_not_exist", "founded": "not_founded", "owns": "does_not_own",
  "supports": "opposes", "increases": "decreases", "active": "inactive",
}[normalize(predicate)]);

export function createClaim(input: Omit<Claim, "normalizedStatement">): Claim {
  return { ...input, normalizedStatement: normalize(`${input.predicate} ${input.object}`) };
}

export function compareClaims(left: Claim, right: Claim): { relation: ClaimRelation; similarity: number; confidence: number; rationale: string } {
  if (left.subjectEntityId !== right.subjectEntityId) return { relation: "unrelated", similarity: 0, confidence: 0.98, rationale: "Claims refer to different resolved entities." };
  const predicateScore = similarity(left.predicate, right.predicate);
  const objectScore = similarity(left.object, right.object);
  const statementScore = similarity(left.statement, right.statement);
  const opposite = oppositePredicate(left.predicate);
  const directOpposition = opposite === normalize(right.predicate) || oppositePredicate(right.predicate) === normalize(left.predicate);

  if ((predicateScore >= 0.85 && objectScore >= 0.85) || statementScore >= 0.9) return { relation: "same", similarity: statementScore, confidence: Math.min(0.99, 0.75 + statementScore * 0.25), rationale: "The claims describe substantially the same proposition." };
  if (directOpposition || (predicateScore >= 0.65 && objectScore < 0.25)) return { relation: "contradictory", similarity: statementScore, confidence: Math.min(0.98, 0.6 + predicateScore * 0.35), rationale: "The claims concern the same subject but assert opposing or mutually exclusive states." };
  if (predicateScore >= 0.5 || statementScore >= 0.35) return { relation: "supporting", similarity: statementScore, confidence: Math.min(0.95, 0.4 + Math.max(predicateScore, statementScore) * 0.55), rationale: "The claims share meaningful context without being identical or directly opposed." };
  return { relation: "unrelated", similarity: statementScore, confidence: 1 - statementScore, rationale: "The claims do not contain enough shared meaning." };
}

export function assessClaim(input: Omit<Claim, "normalizedStatement">): ClaimAssessment {
  const claim = createClaim(input);
  const evidence = evidenceForClaim(claim.statement);
  const supportingEvidence = evidence.filter((item) => item.supports !== false);
  const counterEvidence = evidence.filter((item) => item.supports === false);
  let relationToExisting: ClaimRelation = "unrelated";
  let bestSimilarity = 0;
  let rationale = "No sufficiently related existing claim was found.";

  for (const existing of semanticStore.getClaims()) {
    if (existing.id === claim.id || existing.subjectEntityId !== claim.subjectEntityId) continue;
    const candidate: Claim = {
      id: existing.id,
      subjectEntityId: existing.subjectEntityId ?? "",
      predicate: existing.predicate,
      object: String(existing.object),
      statement: `${existing.predicate} ${String(existing.object)}`,
      normalizedStatement: existing.normalizedText,
      observedAt: existing.lastObservedAt,
      validFrom: existing.validFrom,
      validTo: existing.validTo,
      confidence: existing.confidence,
    };
    const comparison = compareClaims(claim, candidate);
    if (comparison.confidence > bestSimilarity) {
      bestSimilarity = comparison.confidence; relationToExisting = comparison.relation; rationale = comparison.rationale;
    }
  }

  if (supportingEvidence.length && counterEvidence.length) {
    relationToExisting = "contradictory";
    rationale = "Evidence currently contains both supporting and counter-evidence; the claim remains contested.";
  }
  const balance = evidenceBalance(supportingEvidence, counterEvidence);
  const sourceCount = new Set(evidence.map((item) => item.sourceUrl)).size;
  const diversityBonus = Math.min(0.12, Math.max(0, sourceCount - 1) * 0.03);
  const confidence = Math.max(0, Math.min(1, input.confidence * 0.65 + (balance + 1) * 0.17 + diversityBonus));
  return { claim, relationToExisting, similarity: bestSimilarity, supportingEvidence, counterEvidence, confidence, rationale };
}

export function registerClaim(assessment: ClaimAssessment): void {
  const existing = semanticStore.getClaim(assessment.claim.id);
  const now = assessment.claim.observedAt;
  const status: SemanticClaim["status"] = assessment.counterEvidence.length && assessment.supportingEvidence.length
    ? "contested" : assessment.supportingEvidence.length ? "supported" : assessment.counterEvidence.length ? "contested" : "uncertain";
  const claim: SemanticClaim = {
    id: assessment.claim.id,
    subjectEntityId: assessment.claim.subjectEntityId,
    predicate: assessment.claim.predicate,
    object: assessment.claim.object,
    normalizedText: assessment.claim.normalizedStatement,
    status,
    confidence: assessment.confidence,
    firstObservedAt: existing?.firstObservedAt ?? now,
    lastObservedAt: now,
    validFrom: assessment.claim.validFrom,
    validTo: assessment.claim.validTo,
    evidenceIds: assessment.supportingEvidence.map((item) => item.id),
    counterEvidenceIds: assessment.counterEvidence.map((item) => item.id),
  };
  semanticStore.upsertClaim(claim);
  semanticStore.upsertEntity({
    id: claim.id, type: "concept", label: assessment.claim.statement,
    attributes: [
      { key: "subjectEntityId", value: claim.subjectEntityId, source: "ai", confidence: assessment.confidence, observedAt: now },
      { key: "predicate", value: claim.predicate, source: "ai", confidence: assessment.confidence, observedAt: now },
      { key: "object", value: claim.object, source: "ai", confidence: assessment.confidence, observedAt: now },
      { key: "status", value: claim.status, source: "inferred", confidence: 1, observedAt: now },
      { key: "confidence", value: claim.confidence, source: "inferred", confidence: 1, observedAt: now },
      { key: "validFrom", value: claim.validFrom ?? null, source: "ai", confidence: 1, observedAt: now },
      { key: "validTo", value: claim.validTo ?? null, source: "ai", confidence: 1, observedAt: now },
      { key: "supportingEvidenceIds", value: claim.evidenceIds.join(","), source: "web", confidence: 1, observedAt: now, provenance: assessment.supportingEvidence.map((item) => item.sourceUrl) },
      { key: "counterEvidenceIds", value: claim.counterEvidenceIds.join(","), source: "web", confidence: 1, observedAt: now, provenance: assessment.counterEvidence.map((item) => item.sourceUrl) },
    ], createdAt: existing?.firstObservedAt ?? now, updatedAt: now,
  });
}

export function assessStoredClaim(claimId: string) {
  const claim = semanticStore.getClaim(claimId); if (!claim) return undefined;
  const input: Omit<Claim, "normalizedStatement"> = {
    id: claim.id, subjectEntityId: claim.subjectEntityId ?? "", predicate: claim.predicate,
    object: String(claim.object), statement: `${claim.predicate} ${String(claim.object)}`,
    observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, confidence: claim.confidence,
  };
  return assessClaim(input);
}

export { normalize as normalizeClaim, similarity as claimSimilarity };
