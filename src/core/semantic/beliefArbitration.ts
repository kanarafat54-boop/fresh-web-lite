import type { SemanticClaim, SemanticEvidence } from "./types";
import { resolveContradiction, type ContradictionResolution } from "./contradictionResolution";
import { assessClaimConfidence, type ClaimConfidenceAssessment } from "./claimConfidence";
import type { SourceProfile } from "./sourceIntelligence";

export type BeliefDecision = "merge" | "preserve_both" | "downgrade" | "disputed" | "supersede" | "defer";
export type BeliefArbitration = {
  leftClaimId: string;
  rightClaimId: string;
  decision: BeliefDecision;
  confidence: number;
  resolution: ContradictionResolution;
  leftAssessment?: ClaimConfidenceAssessment;
  rightAssessment?: ClaimConfidenceAssessment;
  rationale: string;
  retainedClaimIds: string[];
  supersededClaimIds: string[];
  preserveEvidence: boolean;
  requiresHumanReview: boolean;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function arbitrateBeliefs(
  left: SemanticClaim,
  right: SemanticClaim,
  evidence: SemanticEvidence[] = [],
  profiles = new Map<string, SourceProfile>(),
  assessedAt = new Date().toISOString(),
): BeliefArbitration {
  const resolution = resolveContradiction(left, right);
  const leftAssessment = evidence.length ? assessClaimConfidence(left, evidence, profiles, assessedAt) : undefined;
  const rightAssessment = evidence.length ? assessClaimConfidence(right, evidence, profiles, assessedAt) : undefined;
  const leftConfidence = leftAssessment?.confidence ?? clamp(left.confidence);
  const rightConfidence = rightAssessment?.confidence ?? clamp(right.confidence);
  const confidenceGap = Math.abs(leftConfidence - rightConfidence);
  let decision: BeliefDecision;
  let rationale: string;
  let requiresHumanReview = false;
  let supersededClaimIds: string[] = [];

  if (resolution.relation === "same") {
    decision = "merge";
    rationale = "The propositions represent the same claim and can share a canonical representation while retaining provenance.";
  } else if (resolution.relation === "supporting") {
    decision = "merge";
    rationale = "The propositions are compatible and can strengthen a canonical belief while preserving both evidence trails.";
  } else if (resolution.relation === "unrelated") {
    decision = "preserve_both";
    rationale = "The claims are unrelated and must remain separate knowledge-graph observations.";
  } else if (resolution.relation === "conditional_contradiction") {
    decision = "preserve_both";
    rationale = "The claims conflict only under different temporal conditions, so both historical states remain available.";
  } else if (!evidence.length || confidenceGap < 0.10) {
    decision = "disputed";
    rationale = evidence.length ? "The claims genuinely conflict and neither has enough calibrated confidence advantage to safely dominate the other." : "No independent evidence set was supplied, so Fresh must not manufacture a winner from model confidence alone.";
    requiresHumanReview = true;
  } else if (confidenceGap < 0.25) {
    decision = "downgrade";
    rationale = "One claim is somewhat stronger, but competing evidence remains material. Fresh should reduce confidence rather than erase the weaker position.";
  } else {
    const stronger = leftConfidence > rightConfidence ? left : right;
    const weaker = leftConfidence > rightConfidence ? right : left;
    decision = "supersede";
    supersededClaimIds = [weaker.id];
    rationale = `Claim ${stronger.id} has a substantial calibrated confidence advantage. It becomes the preferred current belief while ${weaker.id} remains preserved as counter-evidence and history.`;
  }

  return {
    leftClaimId: left.id,
    rightClaimId: right.id,
    decision,
    confidence: resolution.confidence,
    resolution,
    leftAssessment,
    rightAssessment,
    rationale,
    retainedClaimIds: [left.id, right.id].filter((id) => !supersededClaimIds.includes(id)),
    supersededClaimIds,
    preserveEvidence: true,
    requiresHumanReview,
  };
}

export function arbitrateClaimSet(
  claims: SemanticClaim[],
  evidence: SemanticEvidence[] = [],
  profiles = new Map<string, SourceProfile>(),
  assessedAt = new Date().toISOString(),
): BeliefArbitration[] {
  const results: BeliefArbitration[] = [];
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) results.push(arbitrateBeliefs(claims[i], claims[j], evidence, profiles, assessedAt));
  }
  return results;
}
