import type { TemporalTruthAssessment } from "./temporalTruth";
import type { TemporalHistory, TemporalHistoryEvent } from "./temporalHistory";

export type ExplanationNodeType = "claim" | "assessment" | "evidence" | "counter_evidence" | "revision" | "source" | "time";

export type ExplanationNode = {
  id: string;
  type: ExplanationNodeType;
  label: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ExplanationEdge = {
  from: string;
  to: string;
  relation: "supports" | "contradicts" | "caused" | "observed_at" | "revised_to" | "derived_from";
};

export type TemporalExplanation = {
  claimId: string;
  assessment?: TemporalTruthAssessment;
  summary: string;
  nodes: ExplanationNode[];
  edges: ExplanationEdge[];
  evidenceIds: string[];
  counterEvidenceIds: string[];
  revisionReasons: string[];
  temporalEvents: TemporalHistoryEvent[];
};

function node(id: string, type: ExplanationNodeType, label: string, metadata?: ExplanationNode["metadata"]): ExplanationNode {
  return { id, type, label, metadata };
}

export function explainTemporalClaim(history: TemporalHistory, claimId: string, asOf = new Date().toISOString()): TemporalExplanation {
  const events = history.events.filter((event) => event.claimId === claimId && event.occurredAt <= asOf).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const assessment = [...events].reverse().find((event) => event.assessment)?.assessment;
  const nodes: ExplanationNode[] = [node(`claim:${claimId}`, "claim", `Claim ${claimId}`)];
  const edges: ExplanationEdge[] = [];
  const evidenceIds = new Set<string>();
  const counterEvidenceIds = new Set<string>();
  const revisionReasons: string[] = [];

  if (assessment) {
    nodes.push(node(`assessment:${claimId}:${asOf}`, "assessment", assessment.status, { confidence: assessment.confidence, asOf }));
    edges.push({ from: `claim:${claimId}`, to: `assessment:${claimId}:${asOf}`, relation: "derived_from" });
    for (const id of assessment.supportingEvidenceIds ?? []) {
      evidenceIds.add(id);
      nodes.push(node(`evidence:${id}`, "evidence", `Evidence ${id}`));
      edges.push({ from: `evidence:${id}`, to: `assessment:${claimId}:${asOf}`, relation: "supports" });
    }
    for (const id of assessment.counterEvidenceIds ?? []) {
      counterEvidenceIds.add(id);
      nodes.push(node(`counter:${id}`, "counter_evidence", `Counter-evidence ${id}`));
      edges.push({ from: `counter:${id}`, to: `assessment:${claimId}:${asOf}`, relation: "contradicts" });
    }
  }

  for (const event of events) {
    nodes.push(node(`time:${event.id}`, "time", event.occurredAt, { recordedAt: event.recordedAt, eventType: event.type }));
    edges.push({ from: `claim:${claimId}`, to: `time:${event.id}`, relation: "observed_at" });
    if (event.revision?.reason) revisionReasons.push(event.revision.reason);
    if (event.evidenceId) {
      evidenceIds.add(event.evidenceId);
      nodes.push(node(`evidence:${event.evidenceId}`, "evidence", `Evidence ${event.evidenceId}`));
      edges.push({ from: `evidence:${event.evidenceId}`, to: `time:${event.id}`, relation: "observed_at" });
    }
    if (event.revision) {
      nodes.push(node(`revision:${event.id}`, "revision", event.revision.reason, { revisedAt: event.revision.revisedAt }));
      edges.push({ from: `revision:${event.id}`, to: `claim:${claimId}`, relation: "revised_to" });
    }
  }

  const summary = assessment
    ? `As of ${asOf}, Fresh assesses claim ${claimId} as ${assessment.status} with ${(assessment.confidence * 100).toFixed(1)}% confidence. ${assessment.reasons.join(" ")}`
    : `Fresh has no temporal assessment for claim ${claimId} as of ${asOf}.`;

  return { claimId, assessment, summary, nodes, edges, evidenceIds: [...evidenceIds], counterEvidenceIds: [...counterEvidenceIds], revisionReasons: [...new Set(revisionReasons)], temporalEvents: events };
}
