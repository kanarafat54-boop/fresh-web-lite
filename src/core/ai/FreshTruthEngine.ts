import type { FreshConfidence } from "./FreshAI";

export type FreshEvidence = {
  id: string;
  source: string;
  claim: string;
  supports: boolean;
  confidence: number;
  observedAt?: string;
};

export type FreshTruthDecision = {
  confidence: FreshConfidence;
  supporting: FreshEvidence[];
  contradicting: FreshEvidence[];
  unknown: FreshEvidence[];
  rationale: string;
};

/**
 * Deterministic evidence arbitration. It does not invent evidence and never
 * deletes conflicting claims. Higher-level reasoning can add richer models
 * later without changing this contract.
 */
export function decideTruth(evidence: FreshEvidence[]): FreshTruthDecision {
  const supporting = evidence.filter((item) => item.supports && item.confidence >= 0.7);
  const contradicting = evidence.filter((item) => !item.supports && item.confidence >= 0.7);
  const unknown = evidence.filter((item) => item.confidence < 0.7);

  if (!evidence.length) {
    return { confidence: "UNKNOWN", supporting: [], contradicting: [], unknown: [], rationale: "No evidence was provided." };
  }
  if (supporting.length && contradicting.length) {
    return { confidence: "CONTRADICTED", supporting, contradicting, unknown, rationale: "Material evidence conflicts; the disagreement is preserved." };
  }
  if (supporting.length) {
    return { confidence: supporting.some((item) => item.confidence >= 0.95) ? "KNOWN" : "SUPPORTED", supporting, contradicting, unknown, rationale: "Available evidence supports the claim." };
  }
  return { confidence: "UNCERTAIN", supporting, contradicting, unknown, rationale: "Available evidence is insufficient for a supported conclusion." };
}
