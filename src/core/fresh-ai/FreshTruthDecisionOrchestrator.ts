import type { Evidence, FreshClaim, TruthState } from "./FreshAIArchitecture";

export type TruthDecision = {
  state: TruthState;
  confidence: number;
  claims: FreshClaim[];
  reasons: string[];
  canAct: boolean;
};

/**
 * #TRUEMODE truth boundary. It never manufactures evidence. Conflicting
 * evidence remains visible instead of being silently discarded.
 */
export class FreshTruthDecisionOrchestrator {
  evaluate(evidence: Evidence[]): TruthDecision {
    if (!evidence.length) {
      return { state: "UNKNOWN", confidence: 0, claims: [], reasons: ["No evidence available."], canAct: false };
    }

    const claims = new Map<string, Evidence[]>();
    for (const item of evidence) {
      const key = normalize(item.claim);
      const bucket = claims.get(key) ?? [];
      bucket.push(item);
      claims.set(key, bucket);
    }

    const grouped = [...claims.entries()].map(([statement, items]) => {
      const confidence = Math.max(...items.map((item) => item.confidence));
      return { statement, items, confidence };
    });

    const hasConflict = grouped.length > 1;
    const strongest = grouped.sort((a, b) => b.confidence - a.confidence)[0];
    const state: TruthState = hasConflict
      ? "CONTRADICTED"
      : strongest.confidence >= 0.9
        ? "KNOWN"
        : strongest.confidence >= 0.6
          ? "PROBABLE"
          : "UNCERTAIN";

    return {
      state,
      confidence: strongest.confidence,
      claims: grouped.map((group) => ({
        statement: group.statement,
        truth: hasConflict ? "CONTRADICTED" : state,
        confidence: group.confidence,
        evidence: group.items,
      })),
      reasons: hasConflict
        ? ["Multiple incompatible claims were preserved."]
        : [`Confidence is ${Math.round(strongest.confidence * 100)}%.`],
      canAct: state === "KNOWN" || state === "PROBABLE",
    };
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
