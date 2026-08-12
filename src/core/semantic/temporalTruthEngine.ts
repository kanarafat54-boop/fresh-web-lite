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
  evaluatedAt: string;
  reason: string;
  evidenceClaimIds: string[];
  requiresHumanReview: boolean;
};

type TruthContext = {
  hasContradiction?: boolean;
  superseded?: boolean;
  requiresReview?: boolean;
  relatedClaimIds?: string[];
};

function asTime(value?: string): number | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

/**
 * Deterministic policy layer for temporal truth.
 * It never deletes evidence or converts uncertainty into truth.
 */
export function assessTemporalTruth(
  claim: SemanticClaim,
  now = new Date().toISOString(),
  context: TruthContext = {},
): TemporalTruthAssessment {
  const nowMs = Date.parse(now);
  const from = asTime(claim.validFrom);
  const to = asTime(claim.validTo);
  const relatedClaimIds = context.relatedClaimIds ?? [];

  const base = {
    claimId: claim.id,
    confidence: claim.confidence,
    validFrom: claim.validFrom,
    validTo: claim.validTo,
    evaluatedAt: now,
    evidenceClaimIds: relatedClaimIds,
  };

  if (context.requiresReview) {
    return { ...base, status: "DEFERRED", requiresHumanReview: true, reason: "Evidence or arbitration requires human review before the claim can be settled." };
  }

  if (context.superseded) {
    return { ...base, status: "SUPERSEDED", requiresHumanReview: false, reason: "A later or stronger claim superseded this belief; the historical record remains preserved." };
  }

  if (context.hasContradiction || claim.status === "contested") {
    return { ...base, status: "CONTESTED", requiresHumanReview: true, reason: "Credible contradictory evidence overlaps the claim's temporal context." };
  }

  if (to !== undefined && to <= nowMs) {
    return { ...base, status: "HISTORICALLY_TRUE", requiresHumanReview: false, reason: "The claim's validity window has ended; its historical truth remains preserved." };
  }

  const validNow = (from === undefined || from <= nowMs) && (to === undefined || nowMs < to);
  if (validNow && claim.status === "supported" && claim.confidence >= 0.7) {
    return { ...base, status: "CURRENTLY_TRUE", requiresHumanReview: false, reason: "The claim is temporally valid and has sufficient calibrated support." };
  }

  if (validNow && claim.status === "supported") {
    return { ...base, status: "DEFERRED", requiresHumanReview: true, reason: "The claim has support, but its calibrated confidence is below the automatic truth threshold." };
  }

  return { ...base, status: "UNKNOWN", requiresHumanReview: false, reason: "Fresh lacks sufficient temporally valid evidence to classify this claim." };
}

export function summarizeTemporalTruth(results: TemporalTruthAssessment[]) {
  return results.reduce<Record<TemporalTruthStatus, number>>((summary, result) => {
    summary[result.status] = (summary[result.status] ?? 0) + 1;
    return summary;
  }, {} as Record<TemporalTruthStatus, number>);
}
