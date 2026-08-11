import type { SemanticClaim } from "./types";
import { compareClaims, type Claim } from "./claimIntelligence";

export type ContradictionReason = "temporal" | "scope" | "entity" | "definition" | "measurement" | "genuine" | "insufficient_context";
export type ContradictionResolution = {
  relation: "same" | "supporting" | "contradictory" | "unrelated" | "conditional_contradiction";
  confidence: number;
  reasons: ContradictionReason[];
  explanation: string;
  temporalOverlap: boolean;
};

const overlap = (a?: string, b?: string, c?: string, d?: string): boolean => {
  const startA = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY;
  const endA = b ? new Date(b).getTime() : Number.POSITIVE_INFINITY;
  const startB = c ? new Date(c).getTime() : Number.NEGATIVE_INFINITY;
  const endB = d ? new Date(d).getTime() : Number.POSITIVE_INFINITY;
  return startA <= endB && startB <= endA;
};

const toClaim = (claim: SemanticClaim): Claim => ({
  id: claim.id, subjectEntityId: claim.subjectEntityId ?? "", predicate: claim.predicate,
  object: String(claim.object), statement: `${claim.predicate} ${String(claim.object)}`,
  normalizedStatement: claim.normalizedText, observedAt: claim.lastObservedAt,
  validFrom: claim.validFrom, validTo: claim.validTo, confidence: claim.confidence,
});

export function resolveContradiction(left: SemanticClaim, right: SemanticClaim): ContradictionResolution {
  if (left.subjectEntityId !== right.subjectEntityId) return { relation: "unrelated", confidence: 0.99, reasons: ["entity"], explanation: "The claims resolve to different entities.", temporalOverlap: false };
  const comparison = compareClaims(toClaim(left), toClaim(right));
  const temporalOverlap = overlap(left.validFrom, left.validTo, right.validFrom, right.validTo);
  if (comparison.relation !== "contradictory") return { relation: comparison.relation, confidence: comparison.confidence, reasons: [], explanation: comparison.rationale, temporalOverlap };
  if (!temporalOverlap) return { relation: "conditional_contradiction", confidence: 0.93, reasons: ["temporal"], explanation: "The propositions conflict in content but apply to non-overlapping validity periods, so they can both be historically true.", temporalOverlap };
  return { relation: "contradictory", confidence: comparison.confidence, reasons: ["genuine"], explanation: "The claims refer to the same entity, assert incompatible propositions, and their validity windows overlap.", temporalOverlap };
}

export function classifyContradictions(claims: SemanticClaim[]): Array<{ leftId: string; rightId: string; resolution: ContradictionResolution }> {
  const results: Array<{ leftId: string; rightId: string; resolution: ContradictionResolution }> = [];
  for (let i = 0; i < claims.length; i += 1) for (let j = i + 1; j < claims.length; j += 1) {
    const resolution = resolveContradiction(claims[i], claims[j]);
    if (resolution.relation === "contradictory" || resolution.relation === "conditional_contradiction") results.push({ leftId: claims[i].id, rightId: claims[j].id, resolution });
  }
  return results;
}
