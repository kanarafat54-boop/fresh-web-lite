import { semanticStore } from "./semanticStore";
import type { SemanticEntity, SemanticRelation } from "./types";

type ResearchSource = { title: string; url: string; snippet?: string; publishedAt?: string; provider: string };
type ResearchVerification = { confidence?: "low" | "medium" | "high"; contradictionsDetected?: boolean };
export type ResearchKnowledgeInput = { query: string; answer: string; sources: ResearchSource[]; verification?: ResearchVerification; observedAt?: string };

const stableId = (prefix: string, value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `${prefix}-${(hash >>> 0).toString(16)}`;
};
const domainOf = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown"; } };

export function ingestResearchKnowledge(input: ResearchKnowledgeInput) {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const confidence = input.verification?.confidence === "high" ? 0.9 : input.verification?.confidence === "medium" ? 0.65 : 0.4;
  const queryId = stableId("research", input.query.trim().toLowerCase());
  const entityIds: string[] = [queryId]; const evidenceIds: string[] = []; const relationIds: string[] = [];
  const researchEntity: SemanticEntity = { id: queryId, type: "event", label: `Research: ${input.query}`, attributes: [
    { key: "answer", value: input.answer.slice(0, 4000), source: "web", confidence, observedAt, provenance: input.sources.map((s) => s.url) },
    { key: "sourceCount", value: input.sources.length, source: "web", confidence: 1, observedAt },
    { key: "contradictionsDetected", value: input.verification?.contradictionsDetected ?? false, source: "system", confidence: 1, observedAt },
  ], createdAt: observedAt, updatedAt: observedAt };
  semanticStore.upsertEntity(researchEntity);

  input.sources.forEach((source, index) => {
    const sourceId = stableId("source", source.url); const evidenceId = stableId("evidence", `${input.query}|${source.url}`);
    semanticStore.recordEvidence({ id: evidenceId, claim: source.snippet ?? source.title, sourceUrl: source.url, sourceTitle: source.title, provider: source.provider, observedAt, publishedAt: source.publishedAt, confidence, supports: !input.verification?.contradictionsDetected });
    evidenceIds.push(evidenceId);
    const sourceEntity: SemanticEntity = { id: sourceId, type: "document", label: source.title, attributes: [
      { key: "url", value: source.url, source: "web", confidence: 1, observedAt },
      { key: "domain", value: domainOf(source.url), source: "web", confidence: 1, observedAt },
      { key: "provider", value: source.provider, source: "connector", confidence: 1, observedAt },
      ...(source.publishedAt ? [{ key: "publishedAt", value: source.publishedAt, source: "web" as const, confidence: 1, observedAt }] : []),
    ], createdAt: observedAt, updatedAt: observedAt };
    semanticStore.upsertEntity(sourceEntity); entityIds.push(sourceId);
    const relation: SemanticRelation = { id: stableId("evidence-link", `${queryId}|${source.url}`), fromEntityId: queryId, relation: index === 0 ? "supported_by_primary_source" : "supported_by_source", toEntityId: sourceId, source: "web", confidence, observedAt, provenance: [source.url] };
    semanticStore.upsertRelation(relation); relationIds.push(relation.id);
  });
  return { entityIds, evidenceIds, relationIds };
}
