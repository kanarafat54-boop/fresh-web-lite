import type { Evidence } from "./FreshAIArchitecture.js";
import { decideTruth, type TruthDecision } from "../semantic/truthDecisionOrchestrator.js";
import type { SemanticClaim, SemanticEvidence } from "../semantic/types.js";

export class SemanticTruthEngine {
  private lastDecisions: TruthDecision[] = [];
  async evaluate(evidence: Evidence[]): Promise<Evidence[]> { this.lastDecisions = this.evaluateDecisions(evidence); return evidence; }
  decide(evidence: Evidence[]): TruthDecision[] { this.lastDecisions = this.evaluateDecisions(evidence); return [...this.lastDecisions]; }
  getLastDecisions(): TruthDecision[] { return [...this.lastDecisions]; }
  private evaluateDecisions(evidence: Evidence[]): TruthDecision[] {
    if (!evidence.length) return [];
    const now = new Date().toISOString();
    const semanticEvidence: SemanticEvidence[] = evidence.map((item) => ({ id: item.id, claim: item.claim, sourceUrl: item.source, sourceTitle: item.source, provider: "fresh-ai", observedAt: item.observedAt ?? now, confidence: Math.max(0, Math.min(1, item.confidence)), supports: true }));
    const claims: SemanticClaim[] = semanticEvidence.map((item) => ({ id: `fresh-claim:${item.id}`, predicate: "fresh.evidence", object: item.claim, normalizedText: normalize(item.claim), status: "supported", confidence: item.confidence ?? 0, firstObservedAt: item.observedAt, lastObservedAt: item.observedAt, evidenceIds: [item.id], counterEvidenceIds: [] }));
    return claims.map((claim) => decideTruth(claim, claims, semanticEvidence, [], [], now));
  }
}
function normalize(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, " "); }
