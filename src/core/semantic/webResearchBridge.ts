import { semanticStore } from "./semanticStore";
import type { SemanticEvidence, SemanticEntity, SemanticRelation } from "./types";

export type WebResearchSource = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
};

export type WebResearchIngestion = {
  query: string;
  searchedAt: string;
  sources: WebResearchSource[];
  confidence: "low" | "medium" | "high";
};

const stableId = (prefix: string, value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}:${(hash >>> 0).toString(16)}`;
};

const domainFromUrl = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
};

const evidenceConfidence = (overall: WebResearchIngestion["confidence"]): number =>
  overall === "high" ? 0.85 : overall === "medium" ? 0.65 : 0.4;

export function ingestWebResearch(input: WebResearchIngestion): {
  evidence: SemanticEvidence[];
  entities: SemanticEntity[];
  relations: SemanticRelation[];
} {
  const evidence: SemanticEvidence[] = [];
  const entities: SemanticEntity[] = [];
  const relations: SemanticRelation[] = [];
  const queryId = stableId("web-query", input.query.trim().toLowerCase());
  const queryEntityId = stableId("concept", input.query.trim().toLowerCase());
  const now = input.searchedAt || new Date().toISOString();

  const queryEntity: SemanticEntity = {
    id: queryEntityId,
    type: "concept",
    label: input.query.trim(),
    attributes: [
      {
        key: "researchQuery",
        value: input.query.trim(),
        source: "web",
        confidence: 1,
        observedAt: now,
        verified: false,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  semanticStore.upsertEntity(queryEntity);
  entities.push(queryEntity);

  for (const source of input.sources) {
    const evidenceId = stableId("evidence", `${source.url}|${input.query}`);
    const sourceEntityId = stableId("document", source.url);
    const sourceEntity: SemanticEntity = {
      id: sourceEntityId,
      type: "document",
      label: source.title,
      attributes: [
        {
          key: "url",
          value: source.url,
          source: "web",
          confidence: 1,
          observedAt: now,
          verified: false,
          provenance: [source.url],
        },
        {
          key: "domain",
          value: domainFromUrl(source.url),
          source: "web",
          confidence: 1,
          observedAt: now,
          verified: false,
          provenance: [source.url],
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const item: SemanticEvidence = {
      id: evidenceId,
      claim: source.snippet || source.title,
      sourceUrl: source.url,
      sourceTitle: source.title,
      provider: source.provider,
      observedAt: now,
      publishedAt: source.publishedAt,
      confidence: evidenceConfidence(input.confidence),
      supports: undefined,
    };

    const relation: SemanticRelation = {
      id: stableId("relation", `${queryId}|evidenced-by|${source.url}`),
      fromEntityId: queryEntityId,
      relation: "evidenced_by",
      toEntityId: sourceEntityId,
      source: "web",
      confidence: item.confidence,
      observedAt: now,
      provenance: [source.url],
    };

    semanticStore.upsertEntity(sourceEntity);
    semanticStore.recordEvidence(item);
    semanticStore.upsertRelation(relation);
    entities.push(sourceEntity);
    evidence.push(item);
    relations.push(relation);
  }

  return { evidence, entities, relations };
}
