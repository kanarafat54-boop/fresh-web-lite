import type { IntelligenceResponse, IntelligenceSource, ResearchMode } from "../../features/ai/intelligence/intelligenceConnectors";
import type { ResearchClaim, ResearchFinding, ResearchReport } from "./types";

const relevance = (source: IntelligenceSource, query: string): number => {
  const haystack = `${source.title} ${source.snippet ?? ""}`.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  if (!terms.length) return 0;
  return Math.round((terms.filter((term) => haystack.includes(term)).length / terms.length) * 100);
};

const buildClaims = (answer: string, sources: IntelligenceSource[], searchedAt: string): ResearchClaim[] => {
  if (!answer.trim()) return [];
  const sentences = answer.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 12);
  return sentences.map((text, index) => ({
    id: `claim-${index + 1}`,
    text,
    sourceUrls: sources.slice(0, 3).map((source) => source.url),
    confidence: sources.length >= 5 ? "high" : sources.length >= 3 ? "medium" : "low",
    observedAt: searchedAt,
  }));
};

export function createResearchReport(
  query: string,
  mode: ResearchMode,
  response: IntelligenceResponse,
): ResearchReport {
  const searchedAt = new Date().toISOString();
  const sources = [...(response.sources ?? [])];
  const findings: ResearchFinding[] = sources
    .map((source) => ({ ...source, relevance: relevance(source, query) }))
    .sort((a, b) => b.relevance - a.relevance);

  return {
    query,
    mode,
    answer: response.text,
    findings,
    claims: buildClaims(response.text, sources, searchedAt),
    searchedAt,
    sourceCount: sources.length,
  };
}
