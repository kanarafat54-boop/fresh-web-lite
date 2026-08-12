import type { SemanticClaim, SemanticEvidence } from "./types";
import { assessTemporalTruth, isActionableTemporalTruth, type TemporalTruthAssessment } from "./temporalTruth";
import { calibrateClaimConfidence, type CalibratedConfidence } from "./confidenceCalibration";
import type { SourceProvenanceEdge, SourceProvenanceNode } from "./sourceProvenance";

export type TruthDecision = {
  claimId: string;
  assessment: TemporalTruthAssessment;
  calibration: CalibratedConfidence;
  actionable: boolean;
  decision: "ALLOW_ACTION" | "ALLOW_WITH_CAUTION" | "BLOCK_ACTION";
  reasons: string[];
};

export function decideTruth(
  claim: SemanticClaim,
  allClaims: SemanticClaim[],
  evidence: SemanticEvidence[],
  provenanceNodes: SourceProvenanceNode[] = [],
  provenanceEdges: SourceProvenanceEdge[] = [],
  now = new Date().toISOString(),
): TruthDecision {
  const calibration = calibrateClaimConfidence(claim, evidence, provenanceNodes, provenanceEdges, allClaims, now);
  const calibratedClaim = { ...claim, confidence: calibration.confidence };
  const assessment = assessTemporalTruth(calibratedClaim, now, allClaims);
  const actionable = isActionableTemporalTruth(assessment) && calibration.actionable;
  const decision = actionable ? "ALLOW_ACTION" : assessment.status === "CURRENT" && calibration.confidence >= 0.6 ? "ALLOW_WITH_CAUTION" : "BLOCK_ACTION";
  const reasons = [
    ...assessment.reasons,
    `Calibrated confidence: ${Math.round(calibration.confidence * 100)}%.`,
    `Independent evidence clusters: ${calibration.independenceClusters}.`,
    `Provenance-independent sources: ${calibration.provenanceIndependentSources}.`,
    `Calibration decision: ${calibration.decision}.`,
  ];
  reasons.push(calibration.actionable ? "Confidence calibration permits automated action." : "Confidence calibration does not permit automated action.");
  return { claimId: claim.id, assessment, calibration, actionable, decision, reasons };
}

export function decideTruthBatch(
  claims: SemanticClaim[],
  evidence: SemanticEvidence[],
  provenanceNodes: SourceProvenanceNode[] = [],
  provenanceEdges: SourceProvenanceEdge[] = [],
  now = new Date().toISOString(),
): TruthDecision[] {
  return claims.map((claim) => decideTruth(claim, claims, evidence, provenanceNodes, provenanceEdges, now));
}
