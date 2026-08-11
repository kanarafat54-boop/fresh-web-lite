import type { IntelligenceSource } from "../../features/ai/intelligence";
import type { ResearchClaim, ResearchContradiction, ResearchSynthesis } from "./researchContracts";

const normalize = (value: string): string => value.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Conservative client-side synthesis metadata. It never declares a claim true
 * merely because multiple sources repeat it; it records provenance and flags
 * possible disagreement for deeper AI review.
 */
export function buildResearchSynthesis(
  answer: string,
  sources: readonly IntelligenceSource[],
): ResearchSynthesis {
  const claims: ResearchClaim[] = sources.map((source, index) => ({
    id: `source-claim-${index + 1}`,
    text: source.snippet?.trim() || source.title,
    sourceUrls: [source.url],
    confidence: sources.length >= 3 ? "medium" : "low",
    observedAt: source.publishedAt ?? new Date().toISOString(),
  }));

  const bySnippet = new Map<string, IntelligenceSource[]>();
  for (const source of sources) {
    const key = normalize(source.snippet ?? source.title);
    if (!key) continue;
    const group = bySnippet.get(key) ?? [];
    group.push(source);
    bySnippet.set(key, group);
  }

  const contradictions: ResearchContradiction[] = [];
  const distinctDomains = new Set(sources.map((source) => {
    try { return new URL(source.url).hostname; } catch { return source.url; }
  }));

  if (sources.length > 1 && distinctDomains.size === 1) {
    contradictions.push({
      topic: "source diversity",
      claims: ["All returned sources resolve to the same domain."],
      sourceUrls: sources.map((source) => source.url),
    });
  }

  for (const [snippet, group] of bySnippet) {
    if (group.length > 1) continue;
    if (snippet.length < 80) continue;
  }

  return {
    answer,
    sources: [...sources],
    claims,
    contradictions,
    searchedAt: new Date().toISOString(),
  };
}
