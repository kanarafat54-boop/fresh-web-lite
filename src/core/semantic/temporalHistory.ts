import type { SemanticClaim, SemanticEvidence } from "./types";
import type { TemporalTruthAssessment } from "./temporalTruth";
import type { TemporalRevision } from "./temporalRevision";

export type TemporalHistoryEventType =
  | "claim_observed"
  | "evidence_added"
  | "assessment_created"
  | "assessment_revised"
  | "claim_retracted"
  | "claim_superseded";

export type TemporalHistoryEvent = {
  id: string;
  type: TemporalHistoryEventType;
  claimId: string;
  occurredAt: string;
  recordedAt: string;
  assessment?: TemporalTruthAssessment;
  revision?: TemporalRevision;
  evidenceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type TemporalSnapshot = {
  id: string;
  asOf: string;
  createdAt: string;
  claimAssessments: Record<string, TemporalTruthAssessment>;
  eventIds: string[];
};

export type TemporalHistory = {
  events: TemporalHistoryEvent[];
  snapshots: TemporalSnapshot[];
};

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function createTemporalHistory(): TemporalHistory {
  return { events: [], snapshots: [] };
}

export function recordClaimObservation(history: TemporalHistory, claim: SemanticClaim, assessment: TemporalTruthAssessment, recordedAt = new Date().toISOString()): TemporalHistoryEvent {
  const event: TemporalHistoryEvent = {
    id: id("temporal-event"), type: "claim_observed", claimId: claim.id,
    occurredAt: claim.lastObservedAt, recordedAt, assessment,
  };
  history.events.push(event);
  return event;
}

export function recordEvidence(history: TemporalHistory, claim: SemanticClaim, evidence: SemanticEvidence, recordedAt = new Date().toISOString()): TemporalHistoryEvent {
  const event: TemporalHistoryEvent = {
    id: id("temporal-event"), type: "evidence_added", claimId: claim.id,
    occurredAt: evidence.observedAt, recordedAt, evidenceId: evidence.id,
  };
  history.events.push(event);
  return event;
}

export function recordRevision(history: TemporalHistory, revision: TemporalRevision): TemporalHistoryEvent {
  const event: TemporalHistoryEvent = {
    id: id("temporal-event"), type: "assessment_revised", claimId: revision.claimId,
    occurredAt: revision.revisedAt, recordedAt: revision.revisedAt, assessment: revision.next, revision,
  };
  history.events.push(event);
  return event;
}

export function createSnapshot(history: TemporalHistory, assessments: TemporalTruthAssessment[], asOf: string, createdAt = new Date().toISOString()): TemporalSnapshot {
  const claimAssessments: Record<string, TemporalTruthAssessment> = {};
  for (const assessment of assessments) claimAssessments[assessment.claimId] = structuredClone(assessment);
  const snapshot: TemporalSnapshot = {
    id: id("temporal-snapshot"), asOf, createdAt,
    claimAssessments, eventIds: history.events.filter((event) => event.occurredAt <= asOf).map((event) => event.id),
  };
  history.snapshots.push(snapshot);
  return snapshot;
}

export function reconstructSnapshot(history: TemporalHistory, asOf: string): TemporalSnapshot {
  const existing = [...history.snapshots].reverse().find((snapshot) => snapshot.asOf === asOf);
  if (existing) return structuredClone(existing);
  const latest = new Map<string, TemporalTruthAssessment>();
  for (const event of [...history.events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
    if (event.occurredAt > asOf || !event.assessment) continue;
    latest.set(event.claimId, structuredClone(event.assessment));
  }
  return { id: `reconstructed-${asOf}`, asOf, createdAt: new Date().toISOString(), claimAssessments: Object.fromEntries(latest), eventIds: history.events.filter((event) => event.occurredAt <= asOf).map((event) => event.id) };
}

export function getClaimHistory(history: TemporalHistory, claimId: string): TemporalHistoryEvent[] {
  return history.events.filter((event) => event.claimId === claimId).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}
