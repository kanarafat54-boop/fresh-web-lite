import type { SemanticClaim } from "./types";

export type TimeInterval = { start: string; end?: string };

export type TemporalTruthStatus =
  | "CURRENT" | "HISTORICAL" | "SUPERSEDED" | "DISPUTED" | "CONTRADICTED"
  | "RETRACTED" | "EXPIRED" | "UNKNOWN_NO_DATA" | "UNKNOWN_CONFLICTING_DATA"
  | "UNKNOWN_LOW_CONFIDENCE" | "UNKNOWN_OUTDATED" | "SUPPORTED";

export type TemporalTruthAssessment = {
  status: TemporalTruthStatus; validNow: boolean; historical: boolean; confidence: number;
  observedAt: string; validFrom?: string; validTo?: string; reasons: string[];
  supportingClaimIds: string[]; conflictingClaimIds: string[];
};

const toMs = (value?: string): number | undefined => value ? Date.parse(value) : undefined;

export function intervalContains(interval: TimeInterval, at: string): boolean {
  const time = toMs(at), start = toMs(interval.start); if (time === undefined || start === undefined || time < start) return false;
  const end = toMs(interval.end); return end === undefined || time < end;
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  const aStart = toMs(a.start), bStart = toMs(b.start); if (aStart === undefined || bStart === undefined) return false;
  const aEnd = toMs(a.end) ?? Number.POSITIVE_INFINITY, bEnd = toMs(b.end) ?? Number.POSITIVE_INFINITY;
  return aStart < bEnd && bStart < aEnd;
}

export function assessTemporalTruth(claim: SemanticClaim, now = new Date().toISOString(), conflictingClaims: SemanticClaim[] = []): TemporalTruthAssessment {
  const validNow = claim.validFrom ? intervalContains({ start: claim.validFrom, end: claim.validTo }, now) : true;
  const end = toMs(claim.validTo), nowMs = toMs(now) ?? Date.now();
  const historical = end !== undefined && end <= nowMs;
  const activeConflicts = conflictingClaims.filter((other) => other.id !== claim.id && intervalsOverlap(
    { start: claim.validFrom ?? claim.firstObservedAt, end: claim.validTo },
    { start: other.validFrom ?? other.firstObservedAt, end: other.validTo },
  ));
  const supportingClaimIds = [claim.id]; const conflictingClaimIds = activeConflicts.map((item) => item.id);
  if (claim.status === "contested" || activeConflicts.length > 0) return { status: "DISPUTED", validNow, historical, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["Competing claims overlap the same temporal context."], supportingClaimIds, conflictingClaimIds };
  if (claim.status === "unsubstantiated") return { status: "UNKNOWN_NO_DATA", validNow, historical, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["No sufficient supporting evidence is available."], supportingClaimIds: [], conflictingClaimIds };
  if (claim.status === "uncertain") return { status: "UNKNOWN_LOW_CONFIDENCE", validNow, historical, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["Evidence exists but confidence is insufficient."], supportingClaimIds, conflictingClaimIds };
  if (historical) return { status: "HISTORICAL", validNow: false, historical: true, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["The validity window has ended."], supportingClaimIds, conflictingClaimIds };
  if (validNow) return { status: "CURRENT", validNow: true, historical: false, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["The validity window includes the requested time."], supportingClaimIds, conflictingClaimIds };
  return { status: "UNKNOWN_OUTDATED", validNow: false, historical: false, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["The claim does not cover the requested time."], supportingClaimIds, conflictingClaimIds };
}
