import type { ClaimAssessment, SemanticClaim } from "./types";
import { assessTemporalTruth, type TemporalTruthAssessment } from "./temporalTruth";

export type TemporalClaimRecord = {
  claim: SemanticClaim;
  assessment: TemporalTruthAssessment;
  relatedClaims: Array<{ claimId: string; relation: ClaimAssessment["relation"]; confidence: number; reasons: string[] }>;
};

export function assessClaimInTemporalContext(
  claim: SemanticClaim,
  relatedClaims: Array<{ claim: SemanticClaim; assessment: ClaimAssessment }>,
  now = new Date().toISOString(),
): TemporalClaimRecord {
  const contradictions = relatedClaims
    .filter((item) => item.assessment.relation === "contradicts")
    .map((item) => item.claim);

  const assessment = assessTemporalTruth(claim, now, contradictions);
  const mapped = relatedClaims.map((item) => ({
    claimId: item.claim.id,
    relation: item.assessment.relation,
    confidence: Math.min(item.assessment.confidence, claim.confidence),
    reasons: item.assessment.reasons,
  }));

  return { claim, assessment, relatedClaims: mapped };
}

export function getClaimTimeline(claim: SemanticClaim): Array<{ label: string; at: string; status: string }> {
  const timeline: Array<{ label: string; at: string; status: string }> = [
    { label: "first_observed", at: claim.firstObservedAt, status: "observed" },
    { label: "last_observed", at: claim.lastObservedAt, status: claim.status },
  ];
  if (claim.validFrom) timeline.push({ label: "valid_from", at: claim.validFrom, status: "valid" });
  if (claim.validTo) timeline.push({ label: "valid_to", at: claim.validTo, status: "ended" });
  return timeline.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
