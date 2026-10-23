import type { ResearchClaim } from "../../core/research/contracts.js";

export type ResearchEvidence = { title: string; url: string; snippet?: string; publishedAt?: string; provider: string };
export type ResearchPass = { answer: string; sources: ResearchEvidence[] };
export type ResearchSynthesis = {
  answer: string;
  sources: ResearchEvidence[];
  claims: ResearchClaim[];
  verification: { passes: number; uniqueSources: number; uniqueDomains: number; sourceDiversity: "low" | "medium" | "high"; confidence: "low" | "medium" | "high"; independentPasses: number; contradictionsDetected: boolean };
};

const TRACKING_PARAMS = /^(utm_.+|fbclid|gclid|mc_cid|mc_eid|ref_src|ref_url)$/i;
const MULTI_PART_SUFFIXES = new Set(["co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "net.au", "org.au", "co.nz", "co.ug", "com.ug", "org.ug", "com.br", "com.sg", "co.in", "co.za"]);

function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return raw.trim();
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return raw.trim();
  }
}

function domainOf(raw: string): string {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    const labels = host.split(".").filter(Boolean);
    if (labels.length <= 2) return host;
    const suffix = labels.slice(-2).join(".");
    const count = MULTI_PART_SUFFIXES.has(suffix) ? 3 : 2;
    return labels.slice(-count).join(".");
  } catch {
    return "unknown";
  }
}

function deduplicateSources(sources: ResearchEvidence[]): ResearchEvidence[] {
  const byCanonicalUrl = new Map<string, ResearchEvidence>();
  for (const source of sources) {
    const url = canonicalUrl(source.url);
    if (!url) continue;
    const normalized = { ...source, url };
    const existing = byCanonicalUrl.get(url);
    if (!existing) {
      byCanonicalUrl.set(url, normalized);
      continue;
    }
    // Preserve the best available attribution without counting repeated hits as new evidence.
    byCanonicalUrl.set(url, {
      ...existing,
      title: existing.title.trim() || normalized.title,
      snippet: (existing.snippet?.trim().length ?? 0) >= (normalized.snippet?.trim().length ?? 0) ? existing.snippet : normalized.snippet,
      publishedAt: existing.publishedAt ?? normalized.publishedAt,
      provider: existing.provider || normalized.provider,
    });
  }
  return [...byCanonicalUrl.values()];
}

/**
 * The current provider returns search-result excerpts, not independently
 * verified propositions. Claims therefore point to exactly one source and
 * remain unverified until a claim-entailment/checking stage exists.
 */
function buildClaims(sources: ResearchEvidence[]): ResearchClaim[] {
  return sources.map((source, index) => ({
    id: `research-source-claim-${index + 1}`,
    text: source.snippet?.trim() || source.title.trim(),
    sourceUrls: [source.url],
    confidence: source.snippet?.trim() ? 0.35 : 0.2,
    status: "unverified",
  })).filter((claim) => claim.text.length > 0);
}

export function synthesizeResearch(passes: ResearchPass[]): ResearchSynthesis {
  const usable = passes.filter((pass) => pass.answer.trim() || pass.sources.length > 0);
  const sources = deduplicateSources(usable.flatMap((pass) => pass.sources));
  const domains = new Set(sources.map((source) => domainOf(source.url)).filter((domain) => domain !== "unknown"));
  const passCount = usable.length;
  // Two queries to one provider are not two independent confirmations.
  const independentPasses = domains.size;
  const sourceDiversity = domains.size >= 6 ? "high" : domains.size >= 3 ? "medium" : "low";
  // Do not infer factual contradictions from two long provider-generated summaries.
  // That requires proposition-level extraction and claim-to-source entailment.
  const contradictionsDetected = false;
  // Without claim-level verification, Fresh must not emit a high-confidence result.
  const confidence = sources.length >= 5 && domains.size >= 3 ? "medium" : "low";
  const primary = usable[0]?.answer ?? "Fresh found sources but could not produce a synthesized answer.";
  const answer = primary;
  const claims = buildClaims(sources);
  return { answer, sources, claims, verification: { passes: passCount, uniqueSources: sources.length, uniqueDomains: domains.size, sourceDiversity, confidence, independentPasses, contradictionsDetected } };
}
