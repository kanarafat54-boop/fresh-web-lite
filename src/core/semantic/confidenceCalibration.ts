import type { SemanticClaim, SemanticEvidence } from "./types";
import { assessClaimConfidence, type ClaimConfidenceAssessment } from "./claimConfidence";
import { clusterEvidence, type EvidenceObservation } from "./evidenceIndependence";
import { buildProvenanceGraph, provenanceAdjustedIndependence, type ProvenanceEdge, type ProvenanceNode } from "./sourceProvenance";
import { compareClaims } from "./claimIntelligence";

export type CalibratedConfidence = ClaimConfidenceAssessment & {
  rawConfidence: number;
  independenceClusters: number;
  provenanceIndependentSources: number;
  relationPenalty: number;
  actionable: boolean;
  decision: "supported" | "contested" | "insufficient_evidence";
  calibrationVersion: "v3";
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function calibrateClaimConfidence(
  claim: SemanticClaim,
  evidence: SemanticEvidence[],
  provenanceNodes: ProvenanceNode[] = [],
  provenanceEdges: ProvenanceEdge[] = [],
  relatedClaims: SemanticClaim[] = [],
  assessedAt = new Date().toISOString(),
): CalibratedConfidence {
  const base = assessClaimConfidence(claim, evidence, undefined, assessedAt);
  const relevant = evidence.filter((item) => claim.evidenceIds.includes(item.id) || claim.counterEvidenceIds.includes(item.id));
  const observations: EvidenceObservation[] = relevant.map((item) => ({ id: item.id, sourceId: item.sourceId, provider: item.provider, sourceUrl: item.sourceUrl, sourceTitle: item.sourceTitle, claimText: item.claim, publishedAt: item.publishedAt, observedAt: item.observedAt }));
  const clusters = clusterEvidence(observations);
  const graph = buildProvenanceGraph(provenanceNodes, provenanceEdges);
  const sourceIds = relevant.map((item) => item.sourceId).filter((id): id is string => Boolean(id));
  const independentSources = graph.nodes.length ? provenanceAdjustedIndependence(graph, sourceIds) : clusters.length;
  const relationPenalty = relatedClaims.reduce((penalty, other) => {
    if (other.id === claim.id) return penalty;
    const left = { id: claim.id, subjectEntityId: claim.subjectEntityId ?? "", predicate: claim.predicate, object: String(claim.object), statement: `${claim.predicate} ${String(claim.object)}`, normalizedStatement: claim.normalizedText, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, confidence: claim.confidence };
    const right = { id: other.id, subjectEntityId: other.subjectEntityId ?? "", predicate: other.predicate, object: String(other.object), statement: `${other.predicate} ${String(other.object)}`, normalizedStatement: other.normalizedText, observedAt: other.lastObservedAt, validFrom: other.validFrom, validTo: other.validTo, confidence: other.confidence };
    const relation = compareClaims(left, right).relation;
    if (relation === "contradictory") return penalty + Math.min(0.20, 0.20 * other.confidence);
    return penalty;
  }, 0);
  const calibrated = clamp(base.confidence - relationPenalty);
  const hasCounterEvidence = claim.counterEvidenceIds.some((id) => relevant.some((item) => item.id === id));
  const decision = relevant.length === 0 ? "insufficient_evidence" : hasCounterEvidence ? "contested" : "supported";
  const actionable = decision === "supported" && calibrated >= 0.80 && independentSources >= 1 && clusters.length >= 1;
  return { ...base, rawConfidence: base.confidence, confidence: calibrated, independenceClusters: clusters.length, provenanceIndependentSources: independentSources, relationPenalty, actionable, decision, calibrationVersion: "v3" };
}
