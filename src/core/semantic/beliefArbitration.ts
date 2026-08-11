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
  if (resolution.relation === "supporting" || resolution.relation === "unrelated") return { leftClaimId: left.id, rightClaimId: right.id, decision: "preserve_both", confidence: resolution.confidence, resolution, rationale: "The claims do not require belief suppression; they remain separate observations in the knowledge graph.", preserveEvidence: true };
  if (resolution.relation === "conditional_contradiction") return { leftClaimId: left.id, rightClaimId: right.id, decision: "preserve_both", confidence: resolution.confidence, resolution, rationale: "The claims conflict only under different temporal conditions, so both historical states should remain available.", preserveEvidence: true };
  if (confidenceGap < 0.10) return { leftClaimId: left.id, rightClaimId: right.id, decision: "disputed", confidence: clamp(1 - confidenceGap), resolution, rationale: "The claims genuinely conflict and neither has enough confidence advantage to safely dominate the other.", preserveEvidence: true };
  if (leftConfidence > rightConfidence) return { leftClaimId: left.id, rightClaimId: right.id, decision: "supersede", confidence: leftConfidence, resolution, rationale: "The left claim has materially stronger calibrated confidence; the weaker claim remains preserved as counter-evidence.", preserveEvidence: true };
  if (rightConfidence > leftConfidence) return { leftClaimId: left.id, rightClaimId: right.id, decision: "supersede", confidence: rightConfidence, resolution, rationale: "The right claim has materially stronger calibrated confidence; the weaker claim remains preserved as counter-evidence.", preserveEvidence: true };
  return { leftClaimId: left.id, rightClaimId: right.id, decision: "defer", confidence: 0, resolution, rationale: "Fresh cannot safely arbitrate the conflict with the available evidence.", preserveEvidence: true };
}

export function arbitrateClaimSet(claims: SemanticClaim[]): BeliefArbitration[] {
  const results: BeliefArbitration[] = [];
  for (let i = 0; i < claims.length; i += 1) for (let j = i + 1; j < claims.length; j += 1) results.push(arbitrateBeliefs(claims[i], claims[j]));
  return results.filter((result) => result.decision !== "preserve_both" || result.resolution.relation !== "unrelated");
}
