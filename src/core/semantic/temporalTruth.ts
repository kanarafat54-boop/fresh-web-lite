import type { SemanticClaim } from "./types";

export type TimeInterval = { start: string; end?: string };

export type TemporalTruthStatus =
  | "CURRENT"
  | "HISTORICAL"
  | "SUPERSEDED"
  | "DISPUTED"
  | "RETRACTED"
  | "EXPIRED"
  | "UNKNOWN"
  | "UNVERIFIED";

export type TemporalTruthAssessment = {
  status: TemporalTruthStatus;
  validNow: boolean;
  historical: boolean;
  confidence: number;
  observedAt: string;
  validFrom?: string;
  validTo?: string;
  reasons: string[];
};

const toMs = (value?: string): number | undefined => value ? Date.parse(value) : undefined;

export function intervalContains(interval: TimeInterval, at: string): boolean {
  const time = toMs(at);
  const start = toMs(interval.start);
  if (time === undefined || start === undefined || time < start) return false;
  const end = toMs(interval.end);
  return end === undefined || time < end;
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  const aStart = toMs(a.start); const bStart = toMs(b.start);
  if (aStart === undefined || bStart === undefined) return false;
  const aEnd = toMs(a.end) ?? Number.POSITIVE_INFINITY;
  const bEnd = toMs(b.end) ?? Number.POSITIVE_INFINITY;
  return aStart < bEnd && bStart < aEnd;
}

export function assessTemporalTruth(
  claim: SemanticClaim,
  now = new Date().toISOString(),
  conflictingClaims: SemanticClaim[] = [],
): TemporalTruthAssessment {
  const validNow = claim.validFrom ? intervalContains({ start: claim.validFrom, end: claim.validTo }, now) : true;
  const end = toMs(claim.validTo);
  const nowMs = toMs(now) ?? Date.now();
  const historical = end !== undefined && end <= nowMs;
  const activeConflicts = conflictingClaims.filter((other) =>
    other.id !== claim.id &&
    intervalsOverlap(
      { start: claim.validFrom ?? claim.firstObservedAt, end: claim.validTo },
      { start: other.validFrom ?? other.firstObservedAt, end: other.validTo },
    ),
  );

  if (claim.status === "contested" || activeConflicts.length > 0) {
    return { status: "DISPUTED", validNow, historical, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["The claim has competing evidence or overlapping conflicting claims."] };
  }
  if (claim.status === "unsubstantiated") return { status: "UNKNOWN", validNow, historical, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["No sufficient supporting evidence is currently available."] };
  if (claim.status === "uncertain") return { status: "UNVERIFIED", validNow, historical, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["Evidence exists but confidence is insufficient for a supported assessment."] };
  if (historical) return { status: "HISTORICAL", validNow: false, historical: true, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["The claim's validity window has ended."] };
  if (validNow) return { status: "CURRENT", validNow: true, historical: false, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["The claim is supported and its validity window includes the requested time."] };
  return { status: "EXPIRED", validNow: false, historical: false, confidence: claim.confidence, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, reasons: ["The claim does not cover the requested time."] };
}
