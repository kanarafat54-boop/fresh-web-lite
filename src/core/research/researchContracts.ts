import type { IntelligenceSource } from "../../features/ai/intelligence";

export type ResearchClaim = {
  id: string;
  text: string;
  sourceUrls: string[];
  confidence: "low" | "medium" | "high";
  observedAt: string;
};

export type ResearchContradiction = {
  topic: string;
  claims: string[];
  sourceUrls: string[];
};

export type ResearchSynthesis = {
  answer: string;
  sources: IntelligenceSource[];
  claims: ResearchClaim[];
  contradictions: ResearchContradiction[];
  searchedAt: string;
};
