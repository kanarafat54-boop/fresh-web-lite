import type { SemanticClaim } from "./types";
import { assessTemporalTruth, intervalsOverlap, type TemporalTruthAssessment } from "./temporalTruth";
export type RevisionReason = "new_support" | "new_conflict" | "validity_expired" | "explicit_retraction" | "superseded" | "confidence_changed" | "no_material_change";
export type TemporalRevision = { claimId: string; previous: TemporalTruthAssessment; next: TemporalTruthAssessment; reason: RevisionReason; revisedAt: string; relatedClaimIds: string[] };
export type TemporalRevisionHistory = TemporalRevision[];
function hasMeaningfulChange(previous: TemporalTruthAssessment, next: TemporalTruthAssessment): boolean { return previous.status !== next.status || Math.abs(previous.confidence - next.confidence) >= 0.05 || previous.validNow !== next.validNow || previous.historical !== next.historical || previous.conflictingClaimIds.join("|") !== next.conflictingClaimIds.join("|"); }
function classifyReason(previous: TemporalTruthAssessment, next: TemporalTruthAssessment): RevisionReason {
  if (next.status === "RETRACTED") return "explicit_retraction";
  if (next.status === "SUPERSEDED") return "superseded";
  if (next.status === "HISTORICAL" && previous.historical === false) return "validity_expired";
  if (next.conflictingClaimIds.length > previous.conflictingClaimIds.length) return "new_conflict";
  if (next.confidence > previous.confidence) return "new_support";
  if (next.confidence !== previous.confidence) return "confidence_changed";
  return "no_material_change";
}
export function reviseTemporalClaim(claim: SemanticClaim, relatedClaims: SemanticClaim[], previous: TemporalTruthAssessment, now = new Date().toISOString()): TemporalRevision {
  const overlapping = relatedClaims.filter((other) => other.id !== claim.id && intervalsOverlap({ start: claim.validFrom ?? claim.firstObservedAt, end: claim.validTo }, { start: other.validFrom ?? other.firstObservedAt, end: other.validTo }));
  const next = assessTemporalTruth(claim, now, overlapping);
  if (!hasMeaningfulChange(previous, next)) return { claimId: claim.id, previous, next, reason: "no_material_change", revisedAt: now, relatedClaimIds: overlapping.map((item) => item.id) };
  return { claimId: claim.id, previous, next, reason: classifyReason(previous, next), revisedAt: now, relatedClaimIds: overlapping.map((item) => item.id) };
}
export function appendRevision(history: TemporalRevisionHistory, revision: TemporalRevision): TemporalRevisionHistory { if (revision.reason === "no_material_change") return history; return [...history, revision]; }
