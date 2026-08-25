import { runIntelligence, type IntelligenceSource, type ResearchMode } from "../../features/ai/intelligence";
import { createResearchEvidence, type ResearchEvidence } from "./researchProvenance";
import { ingestWebResearch } from "./webResearchBridge";
import { evaluateResearchTruth, type ResearchTruthResult } from "./researchTruthPipeline";

export type ResearchRun = {
  query: string;
  mode: ResearchMode;
  answer: string;
  sources: IntelligenceSource[];
  confidence: "low" | "medium" | "high";
  evidence: ResearchEvidence;
  knowledge: ReturnType<typeof ingestWebResearch>;
  truth: ResearchTruthResult;
};

export async function runGlobalResearch(
  query: string,
  options: { mode?: ResearchMode; context?: readonly string[]; maxSources?: number } = {},
): Promise<ResearchRun> {
  const normalized = query.trim();
  if (!normalized) throw new Error("A global research query is required.");

  const response = await runIntelligence({
    prompt: normalized,
    query: normalized,
    task: "research",
    researchMode: options.mode ?? "global",
    context: options.context,
    maxSources: options.maxSources,
  });

  const sources = [...(response.sources ?? [])];
  const confidence = response.confidence ?? (sources.length >= 5 ? "medium" : "low");
  const searchedAt = response.searchedAt ?? new Date().toISOString();
  const knowledge = ingestWebResearch({
    query: normalized,
    searchedAt,
    sources,
    confidence,
  });
  const truth = evaluateResearchTruth({
    query: normalized,
    answer: response.text,
    sources,
    evidence: knowledge.evidence,
    searchedAt,
  });

  return {
    query: normalized,
    mode: response.researchMode ?? options.mode ?? "global",
    answer: response.text,
    sources,
    confidence,
    evidence: createResearchEvidence(response.text, sources, confidence, searchedAt),
    knowledge,
    truth,
  };
}
