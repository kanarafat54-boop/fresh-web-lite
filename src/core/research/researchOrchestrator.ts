import type { IntelligenceRequest, IntelligenceSource } from "../../features/ai/intelligence/intelligenceConnectors";
import type { ResearchClaim, ResearchMode, ResearchResult } from "./contracts";

const MODE_HINTS: Record<ResearchMode, string> = {
  quick: "Prioritize a fast answer from the most relevant current sources.",
  deep: "Investigate broadly, compare sources, identify conflicts, and synthesize carefully.",
  global: "Search across regions, languages, institutions, and international sources where relevant.",
  live: "Prioritize the newest available information and clearly distinguish current from historical claims.",
  academic: "Prioritize academic, scientific, technical, institutional, and primary sources.",
  business: "Prioritize company, market, regulatory, financial, and industry sources.",
  people: "Use public information only and distinguish verified facts from uncertain identity matches.",
  local: "Prioritize geographically relevant sources while retaining broader context when useful.",
};

export type ResearchRun = {
  mode: ResearchMode;
  request: IntelligenceRequest;
};

function claimFromSource(source: IntelligenceSource, index: number): ResearchClaim {
  return {
    id: `source-claim-${index}`,
    text: source.snippet ?? source.title,
    sourceUrls: [source.url],
    confidence: source.snippet ? 0.6 : 0.35,
    status: source.snippet ? "supported" : "unverified",
  };
}

export function prepareResearchRequest(run: ResearchRun): IntelligenceRequest {
  return {
    ...run.request,
    task: "research",
    prompt: `${run.request.prompt}\n\nResearch mode: ${run.mode}.\n${MODE_HINTS[run.mode]}`,
  };
}

export function buildResearchResult(
  query: string,
  mode: ResearchMode,
  answer: string,
  sources: IntelligenceSource[],
): ResearchResult {
  const claims = sources.map(claimFromSource);
  return {
    query,
    mode,
    answer,
    sources: sources.map((source) => ({
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      publishedAt: source.publishedAt,
      provider: source.provider,
    })),
    claims,
    researchedAt: new Date().toISOString(),
  };
}
