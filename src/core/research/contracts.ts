export type ResearchMode = "quick" | "deep" | "global" | "live" | "academic" | "business" | "people" | "local";

export type ResearchClaim = {
  id: string;
  text: string;
  sourceUrls: string[];
  confidence: number;
  status: "supported" | "conflicted" | "unverified";
};

export type ResearchSource = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
};

export type ResearchResult = {
  query: string;
  mode: ResearchMode;
  answer: string;
  sources: ResearchSource[];
  claims: ResearchClaim[];
  researchedAt: string;
};
