import type { SemanticEntity, SemanticObservation, SemanticRelation } from "./types";
import type { IntelligenceSource } from "../../features/ai/intelligence/intelligenceConnectors";

export type ResearchClaim = {
  id: string;
  text: string;
  sourceUrls: string[];
  confidence: "low" | "medium" | "high";
  observedAt: string;
};

export type ResearchEvidence = {
  sources: IntelligenceSource[];
  claims: ResearchClaim[];
  searchedAt: string;
};

export type ProvenanceRecord = {
  evidence: ResearchEvidence;
  entityIds: string[];
  relationIds: string[];
  observationIds: string[];
};

export function createResearchEvidence(
  answer: string,
  sources: readonly IntelligenceSource[],
  confidence: ResearchClaim["confidence"],
  searchedAt = new Date().toISOString(),
): ResearchEvidence {
  const sourceUrls = sources.map((source) => source.url);
  return {
    sources: [...sources],
    claims: answer.trim()
      ? [{
          id: `claim:${Date.now()}`,
          text: answer.trim(),
          sourceUrls,
          confidence,
          observedAt: searchedAt,
        }]
      : [],
    searchedAt,
  };
}

export function createProvenanceRecord(
  evidence: ResearchEvidence,
  entities: SemanticEntity[] = [],
  relations: SemanticRelation[] = [],
  observations: SemanticObservation[] = [],
): ProvenanceRecord {
  return {
    evidence,
    entityIds: entities.map((entity) => entity.id),
    relationIds: relations.map((relation) => relation.id),
    observationIds: observations.map((observation) => observation.id),
  };
}
