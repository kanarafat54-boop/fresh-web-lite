import type { SemanticClaim } from "./types";

export type TemporalTruthStatus =
  | "CURRENTLY_TRUE"
  | "HISTORICALLY_TRUE"
  | "SUPERSEDED"
  | "CONTESTED"
  | "UNKNOWN"
  | "DEFERRED";

export type TemporalTruthAssessment = {
  claimId: string;
  status: TemporalTruthStatus;
  confidence: number;
  validFrom?: string;
  validTo?: string;
  reason: string;
  evidenceClaimIds: string[];
};

function asTime(value?: string): number | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

/**
 * Converts a calibrated claim + arbitration context into an explicit temporal truth state.
 * Historical truth is preserved: expiration does not erase the fact.
 */
export function assessTemporalTruth(
  claim: SemanticClaim,
  now = new Date().toISOString(),
  context: { hasContradiction?: boolean; superseded?: boolean; requiresReview?: boolean; relatedClaimIds?: string[] } = {},
): TemporalTruthAssessment {
  const nowMs = Date.parse(now);
  const from = asTime(claim.validFrom);
  const to = asTime(claim.validTo);

  if (context.requiresReview) {
    return { claimId: claim.id, status: "DEFERRED", confidence: claim.confidence, validFrom: claim.validFrom, validTo: claim.validTo, reason: "The evidence or arbitration requires human review before Fresh treats the claim as settled.", evidenceClaimIds: context.relatedClaimIds ?? [] };
  }

  if (context.hasContradiction) {
    return { claimId: claim.id, status: "CONTESTED", confidence: claim.confidence, validFrom: claim.validFrom, validTo: claim.validTo, reason: "Credible contradictory claim evidence overlaps the current validity window.", evidenceClaimIds: context.relatedClaimIds ?? [] };
  }

  if (context.superseded) {
    return { claimId: claim.id, status: "SUPERSEDED", confidence: claim.confidence, validFrom: claim.validFrom, validTo: claim.validTo, reason: "A later or stronger claim superseded this belief while its historical record remains preserved.", evidenceClaimIds: context.relatedClaimIds ?? [] };
  }

  if (to !== undefined && to <= nowMs) {
    return { claimId: claim.id, status: "HISTORICALLY_TRUE", confidence: claim.confidence, validFrom: claim.validFrom, validTo: claim.validTo, reason: "The claim's validity window has ended; the historical claim remains preserved.", evidenceClaimIds: context.relatedClaimIds ?? [] };
  }

  if ((from === undefined || from <= nowMs) && (to === undefined || nowMs < to)) {
    if (claim.status === "supported" && claim.confidence >= 0.7) {
      return { claimId: claim.id, status: "CURRENTLY_TRUE", confidence: claim.confidence, validFrom: claim.validFrom, validTo: claim.validTo, reason: "The claim is currently within its validity window and has sufficient calibrated support.", evidenceClaimIds: context.relatedClaimIds ?? [] };
    }
    if (claim.status === "contested") {
      return { claimId: claim.id, status: "CONTESTED", confidence: claim.confidence, validFrom: claim.validFrom, validTo: claim.validTo, reason: "The claim is currently valid but competing evidence prevents a settled truth status.", evidenceClaimIds: context.relatedClaimIds ?? [] };
    }
  }

  return { claimId: claim.id, status: "UNKNOWN", confidence: claim.confidence, validFrom: claim.validFrom, validTo: claim.validTo, reason: "Fresh does not have enough temporally valid evidence to classify the claim.", evidenceClaimIds: context.relatedClaimIds ?? [] };
}
