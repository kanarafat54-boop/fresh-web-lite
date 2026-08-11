import { semanticStore } from "./semanticStore";
import type { SemanticEvidence } from "./types";

export type ResearchSource = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
};

export type ResearchIngestion = {
  answer: string;
  sources: ResearchSource[];
  searchedAt: string;
  confidence?: "low" | "medium" | "high";
};

const stableId = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return `web-${Math.abs(hash)}`;
};

export function ingestResearchEvidence(research: ResearchIngestion): SemanticEvidence[] {
  const evidence = research.sources.map((source) => {
    const item: SemanticEvidence = {
      id: stableId(`${source.url}|${research.searchedAt}`),
      claim: source.snippet ?? source.title,
      sourceUrl: source.url,
      sourceTitle: source.title,
      provider: source.provider,
      observedAt: research.searchedAt,
      publishedAt: source.publishedAt,
      confidence: research.confidence === "high" ? 0.85 : research.confidence === "medium" ? 0.65 : 0.4,
      supports: true,
    };
    semanticStore.recordEvidence(item);
    return item;
  });
  return evidence;
}
