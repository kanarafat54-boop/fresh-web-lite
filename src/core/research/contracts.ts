export type ResearchMode = "quick" | "deep" | "global" | "live" | "academic" | "business" | "people" | "local";

export type ResearchClaim = {
  id: string;
  text: string;
  sourceUrls: string[];
  confidence: number;
  status: "supported" | "conflicted" | "unverified";
};

export type EvidencePassport = import("./evidencePassport.js").EvidencePassport;

export type ResearchSource = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
  kind?: "web" | "news" | "video" | "image" | "music";
  evidencePassport?: EvidencePassport;
};

export type ResearchResult = {
  /** Sentence-level evidence mapping; persisted separately from truth assessments. */
  answerEvidence?: import("./claimEvidence.js").AnswerEvidence;
  query: string;
  mode: ResearchMode;
  answer: string;
  sources: ResearchSource[];
  claims: ResearchClaim[];
  researchedAt: string;
};
