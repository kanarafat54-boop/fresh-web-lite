import type { SemanticClaim, SemanticEvidence } from "./types";
import { assessTemporalTruth, isActionableTemporalTruth, type TemporalTruthAssessment } from "./temporalTruth";
import { calibrateClaimConfidence, type CalibratedConfidence } from "./confidenceCalibration";
import type { SourceProvenanceGraph } from "./sourceProvenance";

export type TruthDecision = {
  claimId: string;
  assessment: TemporalTruthAssessment;
  calibration: CalibratedConfidence;
  actionable: boolean;
  decision: "ALLOW_ACTION" | "ALLOW_WITH_CAUTION" | "BLOCK_ACTION";
  reasons: string[];
};

/** Final read-only decision boundary before important Fresh AI automation. */
export function decideTruth(
  claim: SemanticClaim,
  allClaims: SemanticClaim[],
  evidence: SemanticEvidence[],
  provenance: SourceProvenanceGraph,
  profiles?: Map<string, import("./sourceIntelligence").SourceProfile>,
  now = new Date().toISOString(),
): TruthDecision {
  const calibration = calibrateClaimConfidence(claim, evidence, provenance, profiles, now);
  const calibratedClaim = { ...claim, confidence: calibration.confidence };
  const assessment = assessTemporalTruth(calibratedClaim, now, allClaims);
  const actionable = isActionableTemporalTruth(assessment) && calibration.actionable;
  const decision = actionable ? "ALLOW_ACTION" : assessment.status === "CURRENT" && calibration.confidence >= 0.6 ? "ALLOW_WITH_CAUTION" : "BLOCK_ACTION";
  const reasons = [
    ...assessment.reasons,
    `Calibrated confidence: ${Math.round(calibration.confidence * 100)}%.`,
    `Independent evidence clusters: ${calibration.independentEvidenceCount}.`,
    `Provenance independence: ${Math.round(calibration.provenanceIndependence * 100)}%.`,
  ];
  if (calibration.actionable) reasons.push("Confidence calibration permits automated action.");
  else reasons.push("Confidence calibration does not permit automated action.");
  return { claimId: claim.id, assessment, calibration, actionable, decision, reasons };
}

export function decideTruthBatch(
  claims: SemanticClaim[],
  evidence: SemanticEvidence[],
  provenance: SourceProvenanceGraph,
  profiles?: Map<string, import("./sourceIntelligence").SourceProfile>,
  now = new Date().toISOString(),
): TruthDecision[] {
  return claims.map((claim) => decideTruth(claim, claims, evidence, provenance, profiles, now));
}
