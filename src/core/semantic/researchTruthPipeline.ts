import type { IntelligenceSource } from "../../features/ai/intelligence/intelligenceConnectors";
import { decideTruth, type TruthDecision } from "./truthDecisionOrchestrator";
import type { SemanticClaim, SemanticEvidence } from "./types";
import type { ProvenanceNode } from "./sourceProvenance";

export type ResearchTruthInput = {
  query: string;
  answer: string;
  sources: readonly IntelligenceSource[];
  evidence: readonly SemanticEvidence[];
  searchedAt: string;
};

export type ResearchTruthResult = {
  claim: SemanticClaim;
  evidence: SemanticEvidence[];
  provenanceNodes: ProvenanceNode[];
  decision: TruthDecision;
};

const stableId = (prefix: string, value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}:${(hash >>> 0).toString(16)}`;
};

/**
 * Research must cross the semantic truth boundary before it becomes
 * actionable. This adapter deliberately does not manufacture claim facts:
 * the research answer is represented as one claim and each retrieved source
 * remains independently visible as evidence.
 */
export function evaluateResearchTruth(input: ResearchTruthInput): ResearchTruthResult {
  const answer = input.answer.trim();
  const claimId = stableId("research-claim", `${input.query}|${answer}`);
  const evidence = [...input.evidence];
  const claim: SemanticClaim = {
    id: claimId,
    predicate: "research.answer",
    object: answer,
    normalizedText: normalize(answer),
    status: evidence.length ? "supported" : "unsubstantiated",
    confidence: evidence.length ? Math.max(...evidence.map((item) => item.confidence ?? 0)) : 0,
    firstObservedAt: input.searchedAt,
    lastObservedAt: input.searchedAt,
    evidenceIds: evidence.map((item) => item.id),
    counterEvidenceIds: evidence.filter((item) => item.supports === false).map((item) => item.id),
  };

  const provenanceNodes: ProvenanceNode[] = input.sources.map((source) => ({
    id: stableId("source", source.url),
    provider: source.provider,
    url: source.url,
    title: source.title,
    kind: "original",
    observedAt: input.searchedAt,
  }));

  return {
    claim,
    evidence,
    provenanceNodes,
    decision: decideTruth(claim, [claim], evidence, provenanceNodes, [], input.searchedAt),
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
