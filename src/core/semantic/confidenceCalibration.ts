import type { SemanticClaim, SemanticEvidence } from "./types";
import { assessClaimConfidence, type ClaimConfidenceAssessment } from "./claimConfidence";
import { clusterEvidence, type EvidenceObservation } from "./evidenceIndependence";
import { createProvenanceGraph, provenanceAdjustedIndependence, type SourceProvenanceEdge, type SourceProvenanceNode } from "./sourceProvenance";
import { compareClaims } from "./claimGraph";

export type CalibratedConfidence = ClaimConfidenceAssessment & {
  rawConfidence: number;
  independenceClusters: number;
  provenanceIndependentSources: number;
  relationPenalty: number;
  calibrationVersion: "v2";
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function calibrateClaimConfidence(
  claim: SemanticClaim,
  evidence: SemanticEvidence[],
  provenanceNodes: SourceProvenanceNode[] = [],
  provenanceEdges: SourceProvenanceEdge[] = [],
  relatedClaims: SemanticClaim[] = [],
  assessedAt = new Date().toISOString(),
): CalibratedConfidence {
  const base = assessClaimConfidence(claim, evidence, undefined, assessedAt);
  const relevant = evidence.filter((item) => claim.evidenceIds.includes(item.id) || claim.counterEvidenceIds.includes(item.id));
  const observations: EvidenceObservation[] = relevant.map((item) => ({ id: item.id, sourceId: item.sourceId, provider: item.provider, sourceUrl: item.sourceUrl, sourceTitle: item.sourceTitle, claimText: item.claim, publishedAt: item.publishedAt, observedAt: item.observedAt }));
  const clusters = clusterEvidence(observations);
  const graph = createProvenanceGraph(provenanceNodes, provenanceEdges);
  const sourceIds = relevant.map((item) => item.sourceId).filter((id): id is string => Boolean(id));
  const independentSources = graph.nodes.length ? provenanceAdjustedIndependence(graph, sourceIds) : clusters.length;
  const relationPenalty = relatedClaims.reduce((penalty, other) => {
    if (other.id === claim.id) return penalty;
    const relation = compareClaims(claim, other).relation;
    if (relation === "contradicts") return penalty + Math.min(0.20, 0.20 * other.confidence);
    return penalty;
  }, 0);
  const calibrated = clamp(base.confidence - relationPenalty);
  return { ...base, rawConfidence: base.confidence, confidence: calibrated, independenceClusters: clusters.length, provenanceIndependentSources: independentSources, relationPenalty, calibrationVersion: "v2" };
}
