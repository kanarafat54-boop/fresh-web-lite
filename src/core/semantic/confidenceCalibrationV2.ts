import type { SemanticClaim, SemanticEvidence } from "./types";
import { assessClaimConfidence, type ClaimConfidenceAssessment } from "./claimConfidence";
import { compareEvidence, type SourceProfile } from "./sourceIntelligence";

export type CalibrationDecision = "high_confidence" | "moderate_confidence" | "contested" | "insufficient_evidence";

export type ConfidenceCalibrationV2 = ClaimConfidenceAssessment & {
  decision: CalibrationDecision;
  independentEvidenceIds: string[];
  dependencyPenalty: number;
  contradictionPenalty: number;
  temporalFreshness: number;
  calibrationVersion: "v2";
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export function calibrateClaimConfidenceV2(
  claim: SemanticClaim,
  evidence: SemanticEvidence[],
  profiles = new Map<string, SourceProfile>(),
  assessedAt = new Date().toISOString(),
): ConfidenceCalibrationV2 {
  const base = assessClaimConfidence(claim, evidence, profiles, assessedAt);
  const relevant = evidence.filter((e) => claim.evidenceIds.includes(e.id) || claim.counterEvidenceIds.includes(e.id));
  const independent: string[] = [];
  let dependencyPenalty = 0;

  relevant.forEach((item, index) => {
    let best = 1;
    for (let i = 0; i < index; i += 1) {
      best = Math.min(best, compareEvidence(item, relevant[i]).score);
    }
    if (best >= 0.8) independent.push(item.id);
    else dependencyPenalty += (1 - best);
  });

  const normalizedDependencyPenalty = relevant.length ? clamp(dependencyPenalty / relevant.length) : 0;
  const contradictionPenalty = relevant.length ? clamp(base.counterEvidenceIds.length / relevant.length) : 0;
  const freshness = base.components.find((c) => c.name === "freshness")?.score ?? 0;
  const calibratedConfidence = clamp(base.confidence * (1 - normalizedDependencyPenalty * 0.35) * (1 - contradictionPenalty * 0.30));

  let decision: CalibrationDecision;
  if (!relevant.length) decision = "insufficient_evidence";
  else if (contradictionPenalty >= 0.35) decision = "contested";
  else if (calibratedConfidence >= 0.8) decision = "high_confidence";
  else decision = "moderate_confidence";

  return {
    ...base,
    confidence: calibratedConfidence,
    decision,
    independentEvidenceIds: independent,
    dependencyPenalty: normalizedDependencyPenalty,
    contradictionPenalty,
    temporalFreshness: freshness,
    calibrationVersion: "v2",
  };
}
