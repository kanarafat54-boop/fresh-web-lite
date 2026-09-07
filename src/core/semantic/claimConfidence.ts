import type { SemanticClaim, SemanticEvidence } from "./types.js";
import { effectiveEvidenceWeights, type SourceProfile, type EvidenceWeight } from "./sourceIntelligence.js";

export type ConfidenceComponent = { name: "evidence" | "independence" | "source_reliability" | "freshness" | "agreement" | "contradiction"; score: number; weight: number; contribution: number; reason: string };
export type ClaimConfidenceAssessment = { claimId: string; confidence: number; calibrated: boolean; components: ConfidenceComponent[]; supportingEvidenceIds: string[]; counterEvidenceIds: string[]; assessedAt: string };
const clamp = (v: number) => Math.max(0, Math.min(1, v));
function freshness(observedAt: string, now: number): number { const timestamp = new Date(observedAt).getTime(); if (!Number.isFinite(timestamp)) return 0; return Math.exp(-Math.max(0, (now - timestamp) / 86_400_000) / 30); }
export function assessClaimConfidence(claim: SemanticClaim, evidence: SemanticEvidence[], profiles = new Map<string, SourceProfile>(), assessedAt = new Date().toISOString()): ClaimConfidenceAssessment {
  const relevant = evidence.filter((item) => claim.evidenceIds.includes(item.id) || claim.counterEvidenceIds.includes(item.id));
  const supporting = relevant.filter((item) => claim.evidenceIds.includes(item.id) && item.supports !== false), counter = relevant.filter((item) => claim.counterEvidenceIds.includes(item.id) || item.supports === false);
  const weights: EvidenceWeight[] = effectiveEvidenceWeights(relevant, profiles), weightById = new Map(weights.map((w) => [w.evidenceId, w])), now = new Date(assessedAt).getTime();
  const supportScore = supporting.length ? 1 - supporting.reduce((p, item) => p * (1 - (weightById.get(item.id)?.effectiveWeight ?? 0)), 1) : 0;
  const counterScore = counter.length ? 1 - counter.reduce((p, item) => p * (1 - (weightById.get(item.id)?.effectiveWeight ?? 0)), 1) : 0;
  const avgFreshness = relevant.length ? relevant.reduce((sum, item) => sum + freshness(item.observedAt, now), 0) / relevant.length : 0, agreement = supportScore / Math.max(0.0001, supportScore + counterScore), contradiction = counterScore;
  const independence = relevant.length ? weights.reduce((s, w) => s + w.independence, 0) / weights.length : 0, sourceReliability = relevant.length ? weights.reduce((s, w) => s + w.sourceReliability, 0) / weights.length : 0;
  const components: ConfidenceComponent[] = [
    { name: "evidence", score: supportScore, weight: 0.30, contribution: supportScore * 0.30, reason: `${relevant.length} relevant evidence records were evaluated.` },
    { name: "independence", score: independence, weight: 0.20, contribution: independence * 0.20, reason: "Evidence is weighted by estimated independence rather than URL count." },
    { name: "source_reliability", score: sourceReliability, weight: 0.15, contribution: sourceReliability * 0.15, reason: "Source reliability contributes separately from model confidence." },
    { name: "freshness", score: avgFreshness, weight: 0.15, contribution: avgFreshness * 0.15, reason: "Recent observations receive more weight for time-sensitive claims." },
    { name: "agreement", score: agreement, weight: 0.10, contribution: agreement * 0.10, reason: "Supporting and counter evidence are compared rather than collapsed into one count." },
    { name: "contradiction", score: 1 - contradiction, weight: 0.10, contribution: (1 - contradiction) * 0.10, reason: "Strong counter-evidence reduces confidence." },
  ];
  const confidence = clamp(components.reduce((sum, c) => sum + c.contribution, 0));
  return { claimId: claim.id, confidence, calibrated: relevant.length > 0, components, supportingEvidenceIds: supporting.map((e) => e.id), counterEvidenceIds: counter.map((e) => e.id), assessedAt };
}
export function isConfidenceActionable(assessment: ClaimConfidenceAssessment, threshold = 0.8): boolean { return assessment.calibrated && assessment.confidence >= threshold && (assessment.components.find((c) => c.name === "contradiction")?.score ?? 0) >= 0.7; }
