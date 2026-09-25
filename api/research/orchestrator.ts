import type { ResearchClaim } from "../../src/core/research/contracts.js";
import { compareClaims, type Claim } from "../../src/core/semantic/claimIntelligence.js";

export type ResearchEvidence = { title: string; url: string; snippet?: string; publishedAt?: string; provider: string };
export type ResearchPass = { answer: string; sources: ResearchEvidence[] };
export type ResearchSynthesis = {
  answer: string;
  sources: ResearchEvidence[];
  claims: ResearchClaim[];
  verification: { passes: number; uniqueSources: number; uniqueDomains: number; sourceDiversity: "low" | "medium" | "high"; confidence: "low" | "medium" | "high"; independentPasses: number; contradictionsDetected: boolean };
};

const domainOf = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown"; } };
const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const uniqueByUrl = (sources: ResearchEvidence[]): ResearchEvidence[] => {
  const seen = new Set<string>();
  return sources.filter((source) => { if (seen.has(source.url)) return false; seen.add(source.url); return true; });
};

function detectContradictions(passes: ResearchPass[]): boolean {
  const claims: Claim[] = passes.filter((pass) => pass.answer.trim()).map((pass, index) => ({
    id: `research-pass-${index + 1}`,
    statement: pass.answer.trim(),
    normalizedStatement: normalize(pass.answer),
    subjectEntityId: "research",
    predicate: "research.answer",
    object: pass.answer.trim(),
    observedAt: new Date().toISOString(),
    confidence: pass.sources.length >= 3 ? 0.7 : 0.5,
  }));
  for (let i = 0; i < claims.length; i += 1) for (let j = i + 1; j < claims.length; j += 1) {
    const comparison = compareClaims(claims[i], claims[j]);
    if (comparison.relation === "contradictory" && comparison.confidence >= 0.6) return true;
  }
  return false;
}

function buildClaims(passes: ResearchPass[], contradictionsDetected: boolean): ResearchClaim[] {
  return passes
    .filter((pass) => pass.answer.trim())
    .map((pass, index) => ({
      id: `research-pass-claim-${index + 1}`,
      text: pass.answer.trim(),
      sourceUrls: pass.sources.map((source) => source.url),
      confidence: contradictionsDetected ? 0.45 : pass.sources.length >= 3 ? 0.7 : 0.5,
      status: contradictionsDetected ? "conflicted" : "supported",
    }));
}

export function synthesizeResearch(passes: ResearchPass[]): ResearchSynthesis {
  const usable = passes.filter((pass) => pass.answer || pass.sources.length > 0);
  const sources = uniqueByUrl(usable.flatMap((pass) => pass.sources));
  const domains = new Set(sources.map((source) => domainOf(source.url)).filter((domain) => domain !== "unknown"));
  const passCount = usable.length;
  const independentPasses = new Set(usable.flatMap((pass) => pass.sources.map((source) => `${domainOf(source.url)}|${source.provider}`))).size;
  const sourceDiversity = domains.size >= 6 ? "high" : domains.size >= 3 ? "medium" : "low";
  const contradictionsDetected = detectContradictions(usable);
  const confidence = !contradictionsDetected && sources.length >= 8 && domains.size >= 5 && passCount >= 2 ? "high" : sources.length >= 3 ? "medium" : "low";
  const primary = usable[0]?.answer ?? "Fresh found sources but could not produce a synthesized answer.";
  const answer = contradictionsDetected ? `${primary}\n\nFresh found potentially conflicting evidence across independent research passes. Review the cited sources before treating the result as settled.` : primary;
  const claims = buildClaims(usable, contradictionsDetected);
  return { answer, sources, claims, verification: { passes: passCount, uniqueSources: sources.length, uniqueDomains: domains.size, sourceDiversity, confidence, independentPasses, contradictionsDetected } };
}
