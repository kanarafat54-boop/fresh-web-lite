export type ResearchEvidence = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
};

export type ResearchPass = {
  answer: string;
  sources: ResearchEvidence[];
};

export type ResearchSynthesis = {
  answer: string;
  sources: ResearchEvidence[];
  verification: {
    passes: number;
    uniqueSources: number;
    uniqueDomains: number;
    sourceDiversity: "low" | "medium" | "high";
    confidence: "low" | "medium" | "high";
  };
};

const domainOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
};

const uniqueByUrl = (sources: ResearchEvidence[]): ResearchEvidence[] => {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
};

export function synthesizeResearch(passes: ResearchPass[]): ResearchSynthesis {
  const usable = passes.filter((pass) => pass.answer || pass.sources.length > 0);
  const sources = uniqueByUrl(usable.flatMap((pass) => pass.sources));
  const domains = new Set(
    sources.map((source) => domainOf(source.url)).filter((domain) => domain !== "unknown"),
  );
  const passCount = usable.length;
  const sourceDiversity = domains.size >= 6 ? "high" : domains.size >= 3 ? "medium" : "low";
  const confidence =
    sources.length >= 8 && domains.size >= 5 && passCount >= 2
      ? "high"
      : sources.length >= 3
        ? "medium"
        : "low";

  return {
    answer: usable[0]?.answer ?? "Fresh found sources but could not produce a synthesized answer.",
    sources,
    verification: {
      passes: passCount,
      uniqueSources: sources.length,
      uniqueDomains: domains.size,
      sourceDiversity,
      confidence,
    },
  };
}
