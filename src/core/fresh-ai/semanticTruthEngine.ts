import type { Evidence, FreshTruthEngine } from "./FreshAIArchitecture";
import { decideTruth, type TruthDecision } from "../semantic/truthDecisionOrchestrator";
import type { SemanticClaim, SemanticEvidence } from "../semantic/types";

/**
 * Compatibility bridge from the legacy Fresh AI evidence contract to the
 * authoritative semantic TRUEMODE decision boundary.
 *
 * The legacy kernel still consumes Evidence[] for compatibility. Truth
 * decisions are retained on the bridge so callers that need an explicit
 * ALLOW/CAUTION/BLOCK result can use decide(). No second truth algorithm is
 * introduced here.
 */
export class SemanticTruthEngine implements FreshTruthEngine {
  private lastDecisions: TruthDecision[] = [];

  async evaluate(evidence: Evidence[]): Promise<Evidence[]> {
    this.lastDecisions = this.evaluateDecisions(evidence);
    return evidence;
  }

  decide(evidence: Evidence[]): TruthDecision[] {
    this.lastDecisions = this.evaluateDecisions(evidence);
    return [...this.lastDecisions];
  }

  getLastDecisions(): TruthDecision[] {
    return [...this.lastDecisions];
  }

  private evaluateDecisions(evidence: Evidence[]): TruthDecision[] {
    if (!evidence.length) return [];

    const now = new Date().toISOString();
    const semanticEvidence: SemanticEvidence[] = evidence.map((item) => ({
      id: item.id,
      claim: item.claim,
      sourceUrl: item.source,
      sourceTitle: item.source,
      provider: "fresh-ai",
      observedAt: item.observedAt ?? now,
      confidence: Math.max(0, Math.min(1, item.confidence)),
      supports: true,
    }));

    const claims: SemanticClaim[] = semanticEvidence.map((item) => ({
      id: `fresh-claim:${item.id}`,
      predicate: "fresh.evidence",
      object: item.claim,
      normalizedText: normalize(item.claim),
      status: "supported",
      confidence: item.confidence ?? 0,
      firstObservedAt: item.observedAt,
      lastObservedAt: item.observedAt,
      evidenceIds: [item.id],
      counterEvidenceIds: [],
    }));

    return claims.map((claim) => decideTruth(claim, claims, semanticEvidence, [], [], now));
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
