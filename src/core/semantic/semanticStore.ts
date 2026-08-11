import type {
  SemanticEntity,
  SemanticRelation,
  SemanticEntityType,
  SemanticObservation,
  SemanticEvidence,
} from "./types";

export type SemanticQuery = {
  type?: SemanticEntityType;
  labelIncludes?: string;
};

class SemanticStore {
  private entities = new Map<string, SemanticEntity>();
  private relations = new Map<string, SemanticRelation>();
  private observations = new Map<string, SemanticObservation>();
  private evidence = new Map<string, SemanticEvidence>();

  upsertEntity(entity: SemanticEntity): void { this.entities.set(entity.id, entity); }
  getEntity(id: string): SemanticEntity | undefined { return this.entities.get(id); }

  queryEntities(query: SemanticQuery = {}): SemanticEntity[] {
    const label = query.labelIncludes?.toLowerCase();
    return Array.from(this.entities.values()).filter((entity) => {
      if (query.type && entity.type !== query.type) return false;
      if (label && !entity.label.toLowerCase().includes(label)) return false;
      return true;
    });
  }

  upsertRelation(relation: SemanticRelation): void { this.relations.set(relation.id, relation); }
  getRelationsFor(entityId: string): SemanticRelation[] {
    return Array.from(this.relations.values()).filter((relation) => relation.fromEntityId === entityId || relation.toEntityId === entityId);
  }

  recordObservation(observation: SemanticObservation): void { this.observations.set(observation.id, observation); }
  getObservations(entityId: string): SemanticObservation[] {
    return Array.from(this.observations.values()).filter((observation) => observation.entityId === entityId);
  }

  recordEvidence(item: SemanticEvidence): void { this.evidence.set(item.id, item); }
  getEvidence(): SemanticEvidence[] { return Array.from(this.evidence.values()); }
  getEvidenceForUrl(sourceUrl: string): SemanticEvidence[] {
    return Array.from(this.evidence.values()).filter((item) => item.sourceUrl === sourceUrl);
  }

  clear(): void {
    this.entities.clear();
    this.relations.clear();
    this.observations.clear();
    this.evidence.clear();
  }
}

export const semanticStore = new SemanticStore();
