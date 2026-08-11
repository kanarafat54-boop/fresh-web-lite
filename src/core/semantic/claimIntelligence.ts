import { semanticStore } from "./semanticStore";
import type { SemanticEvidence } from "./types";

export type ClaimRelation = "same" | "supporting" | "contradictory" | "unrelated";

export type Claim = {
  id: string;
  subjectEntityId: string;
  statement: string;
  normalizedStatement: string;
  observedAt: string;
  confidence: number;
};

export type ClaimAssessment = {
  claim: Claim;
  relationToExisting: ClaimRelation;
  similarity: number;
  supportingEvidence: SemanticEvidence[];
  counterEvidence: SemanticEvidence[];
  confidence: number;
};

const normalize = (value: string): string => value.toLocaleLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const similarity = (a: string, b: string): number => {
  const left = new Set(normalize(a).split(" ").filter(Boolean));
  const right = new Set(normalize(b).split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / Math.max(left.size, right.size);
};

const evidenceForClaim = (statement: string) => semanticStore.getEvidence().filter((item) => similarity(item.claim, statement) >= 0.45);

export function assessClaim(input: Omit<Claim, "normalizedStatement">): ClaimAssessment {
  const claim: Claim = { ...input, normalizedStatement: normalize(input.statement) };
  const existing = semanticStore.queryEntities({ type: "concept" }).filter((entity) => similarity(entity.label, claim.statement) >= 0.7);
  const evidence = evidenceForClaim(claim.statement);
  const supportingEvidence = evidence.filter((item) => item.supports !== false);
  const counterEvidence = evidence.filter((item) => item.supports === false);

  let relationToExisting: ClaimRelation = "unrelated";
  const best = existing.sort((a, b) => similarity(b.label, claim.statement) - similarity(a.label, claim.statement))[0];
  const bestSimilarity = best ? similarity(best.label, claim.statement) : 0;
  if (bestSimilarity >= 0.9) relationToExisting = "same";
  else if (counterEvidence.length > 0 && supportingEvidence.length > 0) relationToExisting = "contradictory";
  else if (bestSimilarity >= 0.55 || supportingEvidence.length > 0) relationToExisting = "supporting";

  const evidenceBalance = supportingEvidence.length + counterEvidence.length === 0 ? 0 : (supportingEvidence.length - counterEvidence.length) / (supportingEvidence.length + counterEvidence.length);
  const confidence = Math.max(0, Math.min(1, input.confidence * 0.7 + (evidenceBalance + 1) * 0.15));

  return { claim, relationToExisting, similarity: bestSimilarity, supportingEvidence, counterEvidence, confidence };
}

export function registerClaim(assessment: ClaimAssessment): void {
  semanticStore.upsertEntity({
    id: assessment.claim.id,
    type: "concept",
    label: assessment.claim.statement,
    attributes: [
      { key: "subjectEntityId", value: assessment.claim.subjectEntityId, source: "ai", confidence: assessment.confidence, observedAt: assessment.claim.observedAt },
      { key: "claimRelation", value: assessment.relationToExisting, source: "ai", confidence: assessment.confidence, observedAt: assessment.claim.observedAt },
      { key: "confidence", value: assessment.confidence, source: "inferred", confidence: 1, observedAt: assessment.claim.observedAt },
      { key: "supportingEvidenceIds", value: assessment.supportingEvidence.map((e) => e.id).join(","), source: "web", confidence: 1, observedAt: assessment.claim.observedAt, provenance: assessment.supportingEvidence.map((e) => e.sourceUrl) },
      { key: "counterEvidenceIds", value: assessment.counterEvidence.map((e) => e.id).join(","), source: "web", confidence: 1, observedAt: assessment.claim.observedAt, provenance: assessment.counterEvidence.map((e) => e.sourceUrl) },
    ],
    createdAt: assessment.claim.observedAt,
    updatedAt: assessment.claim.observedAt,
  });
}
