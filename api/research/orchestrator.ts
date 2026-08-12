export type ResearchEvidence = { title: string; url: string; snippet?: string; publishedAt?: string; provider: string };
export type ResearchPass = { answer: string; sources: ResearchEvidence[] };
export type ResearchSynthesis = {
  answer: string;
  sources: ResearchEvidence[];
  verification: { passes: number; uniqueSources: number; uniqueDomains: number; sourceDiversity: "low" | "medium" | "high"; confidence: "low" | "medium" | "high"; independentPasses: number; contradictionsDetected: boolean };
};

const domainOf = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown"; } };
const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const uniqueByUrl = (sources: ResearchEvidence[]): ResearchEvidence[] => {
  const seen = new Set<string>();
  return sources.filter((source) => { if (seen.has(source.url)) return false; seen.add(source.url); return true; });
};

function detectContradictions(passes: ResearchPass[]): boolean {
  const answers = passes.map((pass) => normalize(pass.answer)).filter(Boolean);
  if (answers.length < 2) return false;
  const tokenSets = answers.map((answer) => new Set(answer.split(" ").filter((token) => token.length > 3)));
  for (let i = 0; i < tokenSets.length; i += 1) for (let j = i + 1; j < tokenSets.length; j += 1) {
    const intersection = [...tokenSets[i]].filter((token) => tokenSets[j].has(token)).length;
    const union = new Set([...tokenSets[i], ...tokenSets[j]]).size;
    if (union > 20 && intersection / union < 0.12) return true;
  }
  return false;
}

export function synthesizeResearch(passes: ResearchPass[]): ResearchSynthesis {
  const usable = passes.filter((pass) => pass.answer || pass.sources.length > 0);
  const sources = uniqueByUrl(usable.flatMap((pass) => pass.sources));
  const domains = new Set(sources.map((source) => domainOf(source.url)).filter((domain) => domain !== "unknown"));
  const passCount = usable.length;
  const independentPasses = usable.length;
  const sourceDiversity = domains.size >= 6 ? "high" : domains.size >= 3 ? "medium" : "low";
  const contradictionsDetected = detectContradictions(usable);
  const confidence = !contradictionsDetected && sources.length >= 8 && domains.size >= 5 && passCount >= 2 ? "high" : sources.length >= 3 ? "medium" : "low";
  const primary = usable[0]?.answer ?? "Fresh found sources but could not produce a synthesized answer.";
  const answer = contradictionsDetected ? `${primary}\n\nFresh found potentially conflicting evidence across independent research passes. Review the cited sources before treating the result as settled.` : primary;
  return { answer, sources, verification: { passes: passCount, uniqueSources: sources.length, uniqueDomains: domains.size, sourceDiversity, confidence, independentPasses, contradictionsDetected } };
}
