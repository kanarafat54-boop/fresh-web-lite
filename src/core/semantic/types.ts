export type SemanticEntityType =
  | "person" | "organization" | "place" | "product" | "project" | "device"
  | "material" | "machine" | "event" | "document" | "financial_asset"
  | "digital_asset" | "concept" | "custom";

export type SemanticValue = string | number | boolean | null;
export type SemanticSource = "user" | "system" | "connector" | "ai" | "inferred" | "imported" | "web";

export type SemanticAttribute = { key: string; value: SemanticValue; source: SemanticSource; confidence?: number; observedAt: string; verified?: boolean; provenance?: string[] };
export type SemanticEntity = { id: string; type: SemanticEntityType; label: string; attributes: SemanticAttribute[]; createdAt: string; updatedAt: string };
export type SemanticRelation = { id: string; fromEntityId: string; relation: string; toEntityId: string; source: SemanticSource; confidence?: number; observedAt: string; provenance?: string[] };
export type SemanticObservation = { id: string; entityId: string; attribute: SemanticAttribute };
export type SemanticEvidence = { id: string; claim: string; sourceUrl: string; sourceTitle?: string; provider: string; sourceId?: string; observedAt: string; publishedAt?: string; confidence?: number; supports?: boolean };

export type ClaimRelation = "same" | "supports" | "contradicts" | "unrelated";
export type SemanticClaim = {
  id: string;
  subjectEntityId?: string;
  predicate: string;
  object: SemanticValue;
  normalizedText: string;
  status: "supported" | "contested" | "uncertain" | "unsubstantiated";
  confidence: number;
  firstObservedAt: string;
  lastObservedAt: string;
  validFrom?: string;
  validTo?: string;
  evidenceIds: string[];
  counterEvidenceIds: string[];
};
export type ClaimAssessment = {
  relation: ClaimRelation;
  confidence: number;
  reasons: string[];
};
