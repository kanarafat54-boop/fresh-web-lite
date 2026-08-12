import type { SemanticClaim } from "./types";
import { assessTemporalTruth, intervalsOverlap, type TemporalTruthAssessment } from "./temporalTruth";
import { reviseTemporalClaim, type TemporalRevision } from "./temporalRevision";

export type TemporalArbitrationDecision =
  | "CURRENT"
  | "HISTORICAL"
  | "DISPUTED"
  | "SUPERSEDED"
  | "UNKNOWN";

export type TemporalArbitration = {
  claimId: string;
  decision: TemporalArbitrationDecision;
  assessment: TemporalTruthAssessment;
  revision?: TemporalRevision;
  relatedClaimIds: string[];
  requiresHumanReview: boolean;
};

/**
 * Deterministic temporal gate. It never declares a claim true merely because
 * it is recent; evidence confidence and overlapping contradictions are carried
 * forward from the semantic truth assessment.
 */
export function arbitrateTemporalTruth(
  claim: SemanticClaim,
  relatedClaims: SemanticClaim[],
  previous?: TemporalTruthAssessment,
  now = new Date().toISOString(),
): TemporalArbitration {
  const overlapping = relatedClaims.filter((other) =>
    other.id !== claim.id && intervalsOverlap(
      { start: claim.validFrom ?? claim.firstObservedAt, end: claim.validTo },
      { start: other.validFrom ?? other.firstObservedAt, end: other.validTo },
    ),
  );

  const assessment = assessTemporalTruth(claim, now, overlapping);
  const revision = previous ? reviseTemporalClaim(claim, overlapping, previous, now) : undefined;

  let decision: TemporalArbitrationDecision = "UNKNOWN";
  if (assessment.status === "CURRENT" || assessment.status === "SUPPORTED") decision = "CURRENT";
  else if (assessment.status === "HISTORICAL" || assessment.status === "EXPIRED") decision = "HISTORICAL";
  else if (assessment.status === "DISPUTED" || assessment.status === "CONTRADICTED") decision = "DISPUTED";
  else if (assessment.status === "SUPERSEDED") decision = "SUPERSEDED";

  return {
    claimId: claim.id,
    decision,
    assessment,
    revision,
    relatedClaimIds: overlapping.map((item) => item.id),
    requiresHumanReview: decision === "DISPUTED" || assessment.confidence < 0.65,
  };
}

export function arbitrateTemporalClaimSet(claims: SemanticClaim[], now = new Date().toISOString()): TemporalArbitration[] {
  return claims.map((claim) => arbitrateTemporalTruth(claim, claims.filter((other) => other.id !== claim.id), undefined, now));
}
