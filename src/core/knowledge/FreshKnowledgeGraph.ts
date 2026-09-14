export type FreshKnowledgeEntityType =
  | "Person" | "Organization" | "Place" | "CountryTerritory" | "Language"
  | "Work" | "ScientificConcept" | "Event" | "ProductTechnology" | "Software"
  | "Dataset" | "Institution" | "Species" | "LegalRegulatoryConcept"
  | "TimePeriod" | "MeasurementUnit";

export type FreshKnowledgeRelation =
  | "instance-of" | "subclass-of" | "part-of" | "located-in" | "member-of"
  | "founded-by" | "owned-by" | "created-by" | "developed-by" | "based-on"
  | "related-to" | "predecessor-of" | "successor-of" | "occurs-at" | "occurs-during"
  | "uses-language" | "has-license" | "governed-by" | "cited-by" | "supports" | "contradicts";

export type FreshKnowledgeProvenance = {
  sourceId: string;
  sourceUrl?: string;
  sourceVersion?: string;
  acquiredAt: string;
  contentSha256: string;
  transformationVersion: string;
  licenseEvidenceRef: string;
};

export type FreshKnowledgeClaim = {
  claimId: string;
  subjectId: string;
  predicate: string;
  object: string | number | boolean | null;
  objectEntityId?: string;
  language?: string;
  jurisdiction?: string;
  validFrom?: string;
  validUntil?: string;
  sourceIds: string[];
  referenceUrls: string[];
  provenance: FreshKnowledgeProvenance;
  confidence: number;
  validationStatus: "unreviewed" | "validated" | "contested" | "rejected";
  supportingClaimIds: string[];
  counterEvidenceClaimIds: string[];
  contradictionGroupId?: string;
  lastVerifiedAt?: string;
};

export type FreshKnowledgeEntity = {
  entityId: string;
  entityType: FreshKnowledgeEntityType;
  canonicalLabel: string;
  aliases: Array<{ value: string; language?: string; script?: string }>;
  externalIds: Array<{ system: string; value: string }>;
  jurisdiction?: string;
  provenance: FreshKnowledgeProvenance;
  claimIds: string[];
};

export type FreshKnowledgeRelationRecord = {
  relationId: string;
  fromEntityId: string;
  relation: FreshKnowledgeRelation;
  toEntityId: string;
  claimId: string;
  provenance: FreshKnowledgeProvenance;
  confidence: number;
};

export type FreshKnowledgeGraphRecord = {
  schemaVersion: "fresh-knowledge-graph-v1";
  entity?: FreshKnowledgeEntity;
  claim?: FreshKnowledgeClaim;
  relation?: FreshKnowledgeRelationRecord;
};
