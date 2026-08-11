import type { SemanticClaim } from "./types";
import { resolveContradiction, type ContradictionResolution } from "./contradictionResolution";

export type BeliefDecision = "merge" | "preserve_both" | "downgrade" | "disputed" | "supersede" | "defer";
export type BeliefArbitration = {
  leftClaimId: string;
  rightClaimId: string;
  decision: BeliefDecision;
  confidence: number;
  resolution: ContradictionResolution;
  rationale: string;
  preserveEvidence: boolean;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function arbitrateBeliefs(left: SemanticClaim, right: SemanticClaim): BeliefArbitration {
  const resolution = resolveContradiction(left, right);
  const leftConfidence = clamp(left.confidence);
  const rightConfidence = clamp(right.confidence);
  const confidenceGap = Math.abs(leftConfidence - rightConfidence);

  if (resolution.relation === "same") return { leftClaimId: left.id, rightClaimId: right.id, decision: "merge", confidence: resolution.confidence, resolution, rationale: "The propositions represent the same claim and can share a canonical representation while retaining provenance.", preserveEvidence: true };
  if (resolution.relation === "supporting") return { leftClaimId: left.id, rightClaimId: right.id, decision: "merge", confidence: resolution.confidence, resolution, rationale: "The propositions are compatible and can strengthen a canonical belief while preserving both evidence trails.", preserveEvidence: true };
  if (resolution.relation === "unrelated") return { leftClaimId: left.id, rightClaimId: right.id, decision: "preserve_both", confidence: resolution.confidence, resolution, rationale: "The claims are unrelated and must remain separate knowledge-graph observations.", preserveEvidence: true };
  if (resolution.relation === "conditional_contradiction") return { leftClaimId: left.id, rightClaimId: right.id, decision: "preserve_both", confidence: resolution.confidence, resolution, rationale: "The claims conflict only under different temporal conditions, so both historical states remain available.", preserveEvidence: true };
  if (confidenceGap < 0.10) return { leftClaimId: left.id, rightClaimId: right.id, decision: "disputed", confidence: clamp(1 - confidenceGap), resolution, rationale: "The claims genuinely conflict and neither has enough confidence advantage to safely dominate the other.", preserveEvidence: true };
  if (confidenceGap < 0.25) return { leftClaimId: left.id, rightClaimId: right.id, decision: "downgrade", confidence: clamp(0.65 + confidenceGap), resolution, rationale: "One claim is somewhat stronger, but the competing evidence is still material. Fresh should reduce confidence rather than erase the weaker position.", preserveEvidence: true };
  const stronger = leftConfidence > rightConfidence ? left : right;
  return { leftClaimId: left.id, rightClaimId: right.id, decision: "supersede", confidence: stronger.confidence, resolution, rationale: `Claim ${stronger.id} has a substantial confidence advantage. It may become the preferred current belief, while the competing claim remains preserved as counter-evidence and history.`, preserveEvidence: true };
}

export function arbitrateClaimSet(claims: SemanticClaim[]): BeliefArbitration[] {
  const results: BeliefArbitration[] = [];
  for (let i = 0; i < claims.length; i += 1) for (let j = i + 1; j < claims.length; j += 1) results.push(arbitrateBeliefs(claims[i], claims[j]));
  return results;
}
