import type { Evidence, FreshClaim, TruthState } from "./FreshAIArchitecture";
import { SemanticTruthEngine } from "./semanticTruthEngine";

export type TruthDecision = {
  state: TruthState;
  confidence: number;
  claims: FreshClaim[];
  reasons: string[];
  canAct: boolean;
};

/**
 * Compatibility facade for the former Fresh AI truth API.
 *
 * The actual truth decision is owned by semantic TRUEMODE. This class keeps
 * the legacy result shape for existing consumers without maintaining a second
 * confidence, contradiction, or temporal-truth algorithm.
 */
export class FreshTruthDecisionOrchestrator {
  private readonly semanticTruth = new SemanticTruthEngine();

  evaluate(evidence: Evidence[]): TruthDecision {
    if (!evidence.length) {
      return {
        state: "UNKNOWN",
        confidence: 0,
        claims: [],
        reasons: ["No evidence available."],
        canAct: false,
      };
    }

    const decisions = this.semanticTruth.decide(evidence);
    const strongest = [...decisions].sort(
      (a, b) => b.calibration.confidence - a.calibration.confidence,
    )[0];

    const state: TruthState = decisions.some((item) => item.decision === "BLOCK_ACTION")
      ? "BLOCKED"
      : decisions.some((item) => item.decision === "ALLOW_WITH_CAUTION")
        ? "PROBABLE"
        : "KNOWN";

    const claims: FreshClaim[] = evidence.map((item, index) => {
      const decision = decisions[index];
      const claimState: TruthState = decision.decision === "ALLOW_ACTION"
        ? "KNOWN"
        : decision.decision === "ALLOW_WITH_CAUTION"
          ? "PROBABLE"
          : "BLOCKED";
      return {
        statement: item.claim,
        truth: claimState,
        confidence: decision.calibration.confidence,
        evidence: [item],
      };
    });

    return {
      state,
      confidence: strongest?.calibration.confidence ?? 0,
      claims,
      reasons: decisions.flatMap((item) => item.reasons),
      canAct: decisions.length > 0 && decisions.every((item) => item.actionable),
    };
  }
}
