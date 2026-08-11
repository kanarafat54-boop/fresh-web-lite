import { semanticStore } from "./semanticStore";
import type { SemanticEntity, SemanticEntityType, SemanticRelation } from "./types";

export type EntityMention = {
  label: string;
  type: SemanticEntityType;
  aliases?: string[];
};

export type ResolvedEntity = {
  entityId: string;
  confidence: number;
  status: "exact" | "probable" | "possible" | "new";
};

const normalize = (value: string): string =>
  value.toLocaleLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const tokenSimilarity = (left: string, right: string): number => {
  const a = new Set(normalize(left).split(" ").filter(Boolean));
  const b = new Set(normalize(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / new Set([...a, ...b]).size;
};

export function resolveEntity(mention: EntityMention): ResolvedEntity {
  const labels = [mention.label, ...(mention.aliases ?? [])].map(normalize).filter(Boolean);
  const candidates = semanticStore.queryEntities({ type: mention.type });
  let best: { entity: SemanticEntity; score: number } | undefined;

  for (const entity of candidates) {
    const score = Math.max(...labels.map((label) => tokenSimilarity(label, entity.label)), 0);
    if (!best || score > best.score) best = { entity, score };
  }

  if (!best || best.score < 0.5) return { entityId: createEntity(mention).id, confidence: 0.25, status: "new" };
  if (best.score >= 0.95) return { entityId: best.entity.id, confidence: best.score, status: "exact" };
  if (best.score >= 0.75) return { entityId: best.entity.id, confidence: best.score, status: "probable" };
  return { entityId: best.entity.id, confidence: best.score, status: "possible" };
}

export function createEntity(mention: EntityMention, observedAt = new Date().toISOString()): SemanticEntity {
  const entity: SemanticEntity = {
    id: `entity-${crypto.randomUUID()}`,
    type: mention.type,
    label: mention.label.trim(),
    attributes: [
      { key: "aliases", value: (mention.aliases ?? []).join(" | "), source: "inferred", confidence: 0.5, observedAt },
    ],
    createdAt: observedAt,
    updatedAt: observedAt,
  };
  semanticStore.upsertEntity(entity);
  return entity;
}

export type ExtractedRelation = {
  subject: EntityMention;
  relation: string;
  object: EntityMention;
  confidence: number;
};

export function resolveRelations(relations: ExtractedRelation[], observedAt = new Date().toISOString()): SemanticRelation[] {
  return relations.map((item) => {
    const subject = resolveEntity(item.subject);
    const object = resolveEntity(item.object);
    const relation: SemanticRelation = {
      id: `relation-${crypto.randomUUID()}`,
      fromEntityId: subject.entityId,
      relation: item.relation,
      toEntityId: object.entityId,
      source: "ai",
      confidence: Math.min(item.confidence, subject.confidence, object.confidence),
      observedAt,
    };
    semanticStore.upsertRelation(relation);
    return relation;
  });
}
