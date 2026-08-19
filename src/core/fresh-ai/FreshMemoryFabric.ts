import type { FreshMemoryRecord, FreshMemoryStore } from "./FreshAIKernel";

export type MemoryProvenance = {
  source: string;
  capturedAt: string;
  confidence: number;
};

export type ProvenancedMemory = FreshMemoryRecord & {
  provenance: MemoryProvenance;
  tags: string[];
  expiresAt?: string;
};

/** In-process memory fabric. Persistent adapters can implement the same contract
 * later without changing Fresh AI's reasoning interface. */
export class FreshMemoryFabric implements FreshMemoryStore {
  private readonly records = new Map<string, ProvenancedMemory>();

  async search(query: string, scope?: FreshMemoryRecord["scope"]): Promise<ProvenancedMemory[]> {
    const terms = tokenize(query);
    return [...this.records.values()]
      .filter((record) => !scope || record.scope === scope)
      .filter((record) => !record.expiresAt || new Date(record.expiresAt).getTime() > Date.now())
      .map((record) => ({ record, score: relevance(record.content, terms) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ record }) => record)
      .slice(0, 20);
  }

  async remember(record: FreshMemoryRecord): Promise<void> {
    this.records.set(record.id, {
      ...record,
      provenance: {
        source: record.source ?? "fresh-ai",
        capturedAt: record.createdAt,
        confidence: 1,
      },
      tags: tokenize(record.content).slice(0, 12),
    });
  }

  forget(id: string): boolean {
    return this.records.delete(id);
  }

  clearScope(scope: FreshMemoryRecord["scope"]): number {
    let count = 0;
    for (const [id, record] of this.records) {
      if (record.scope === scope) {
        this.records.delete(id);
        count++;
      }
    }
    return count;
  }
}

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
}

function relevance(content: string, terms: string[]): number {
  const haystack = tokenize(content);
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}
