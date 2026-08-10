export type SemanticEntityType =
  | "person"
  | "organization"
  | "place"
  | "product"
  | "project"
  | "device"
  | "material"
  | "machine"
  | "event"
  | "document"
  | "financial_asset"
  | "digital_asset"
  | "concept"
  | "custom";

export type SemanticValue = string | number | boolean | null;

export type SemanticAttribute = {
  key: string;
  value: SemanticValue;
  source: "user" | "system" | "connector" | "ai" | "inferred" | "imported";
  confidence?: number;
  observedAt: string;
  verified?: boolean;
};

export type SemanticEntity = {
  id: string;
  type: SemanticEntityType;
  label: string;
  attributes: SemanticAttribute[];
  createdAt: string;
  updatedAt: string;
};

export type SemanticRelation = {
  id: string;
  fromEntityId: string;
  relation: string;
  toEntityId: string;
  source: SemanticAttribute["source"];
  confidence?: number;
  observedAt: string;
};

export type SemanticObservation = {
  id: string;
  entityId: string;
  attribute: SemanticAttribute;
};
