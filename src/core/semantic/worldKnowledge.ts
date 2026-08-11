import { semanticStore } from "./semanticStore";
import type { SemanticEntity, SemanticRelation } from "./types";

export type WorldKnowledgeSnapshot = { queryEntity: SemanticEntity; sources: SemanticEntity[]; relations: SemanticRelation[] };

export function getWorldKnowledge(queryEntityId: string): WorldKnowledgeSnapshot | undefined {
  const queryEntity = semanticStore.getEntity(queryEntityId);
  if (!queryEntity) return undefined;
  const relations = semanticStore.getRelationsFor(queryEntityId);
  const sources = relations.map((relation) => semanticStore.getEntity(relation.toEntityId)).filter((entity): entity is SemanticEntity => Boolean(entity));
  return { queryEntity, sources, relations };
}
