import type { ResearchClaim } from "../../core/research/contracts.js";
import { compareClaims, type Claim } from "../../core/semantic/claimIntelligence.js";

export type ResearchEvidence = { title: string; url: string; snippet?: string; publishedAt?: string; provider: string };
export type ResearchPass = { answer: string; sources: ResearchEvidence[] };
export type ResearchSynthesis = {
  answer: string;
  sources: ResearchEvidence[];
  claims: ResearchClaim[];
  verification: { passes: number; uniqueSources: number; uniqueDomains: number; sourceDiversity: "low" | "medium" | "high"; confidence: "low" | "medium" | "high"; independentPasses: number; contradictionsDetected: boolean };
};

const domainOf = (url: string): string => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return "unknown"; } };
const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** Canonicalize tracking variants before counting independent sources. */
export function canonicalResearchUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.protocol = "https:";
    url.port = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|gclid|fbclid|mc_cid|mc_eid|ref_src|source)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch { return ""; }
}

function uniqueByUrl(sources: ResearchEvidence[]): ResearchEvidence[] {
  const unique = new Map<string, ResearchEvidence>();
  for (const source of sources) {
    const canonical = canonicalResearchUrl(source.url);
    if (!canonical) continue;
    const previous = unique.get(canonical);
    if (!previous) unique.set(canonical, { ...source, url: canonical });
    else unique.set(canonical, {
      ...previous,
      title: previous.title || source.title,
      snippet: (previous.snippet?.length ?? 0) >= (source.snippet?.length ?? 0) ? previous.snippet : source.snippet,
      publishedAt: previous.publishedAt || source.publishedAt,
      provider: [...new Set([previous.provider, source.provider])].join(", "),
    });
  }
  return [...unique.values()];
}

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

/** Claims are derived from source-level snippets so each citation points to the result that supplied it. */
function buildClaims(sources: ResearchEvidence[], contradictionsDetected: boolean): ResearchClaim[] {
  const groups = new Map<string, ResearchEvidence[]>();
  for (const source of sources) {
    const text = source.snippet?.trim();
    if (!text) continue;
    const key = normalize(text);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }
  return [...groups.values()].map((group, index) => {
    const sourceUrls = [...new Set(group.map((source) => source.url))];
    const distinctDomains = new Set(group.map((source) => domainOf(source.url))).size;
    const corroborated = distinctDomains >= 2;
    return {
      id: `research-source-claim-${index + 1}`,
      text: group[0].snippet!.trim(),
      sourceUrls,
      confidence: contradictionsDetected ? 0.2 : corroborated ? 0.65 : 0.35,
      status: contradictionsDetected ? "conflicted" : corroborated ? "supported" : "unverified",
    };
  });
}

export function synthesizeResearch(passes: ResearchPass[]): ResearchSynthesis {
  const usable = passes.filter((pass) => pass.answer.trim() || pass.sources.length > 0);
  const sources = uniqueByUrl(usable.flatMap((pass) => pass.sources));
  const domains = new Set(sources.map((source) => domainOf(source.url)).filter((domain) => domain !== "unknown"));
  const passCount = usable.length;
  const independentPasses = new Set(sources.map((source) => `${domainOf(source.url)}|${source.provider}`)).size;
  const sourceDiversity = domains.size >= 6 ? "high" : domains.size >= 3 ? "medium" : "low";
  const contradictionsDetected = detectContradictions(usable);
  // Confidence reflects distinct publishers and usable sources, not number of reasoning layers or repeated passes.
  const confidence = !contradictionsDetected && sources.length >= 8 && domains.size >= 5 ? "high" : !contradictionsDetected && sources.length >= 3 && domains.size >= 2 ? "medium" : "low";
  const primary = usable[0]?.answer ?? "Fresh found sources but could not produce a synthesized answer.";
  const answer = contradictionsDetected ? `${primary}\n\nFresh found potentially conflicting evidence across research passes. Review the cited sources before treating the result as settled.` : primary;
  const claims = buildClaims(sources, contradictionsDetected);
  return { answer, sources, claims, verification: { passes: passCount, uniqueSources: sources.length, uniqueDomains: domains.size, sourceDiversity, confidence, independentPasses, contradictionsDetected } };
}
