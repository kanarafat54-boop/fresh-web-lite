export type ResearchClaim = {
  id: string;
  text: string;
  sourceUrls: string[];
  confidence: "low" | "medium" | "high";
  observedAt: string;
};

export type ResearchFinding = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
  relevance: number;
};

export type ResearchReport = {
  query: string;
  mode: string;
  answer: string;
  findings: ResearchFinding[];
  claims: ResearchClaim[];
  searchedAt: string;
  sourceCount: number;
};
