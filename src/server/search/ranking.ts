import type { RankingEngine } from "./contracts.js";

/** Okapi BM25 (k1=1.2, b=0.75). Deterministic; no external dependencies. */
export class Bm25RankingEngine implements RankingEngine {
  private k1: number;
  private b: number;
  constructor(k1 = 1.2, b = 0.75) { this.k1 = k1; this.b = b; }
  rank(queryTerms: string[], candidates: Array<{ id: string; terms: string[] }>, stats: { documentCount: number; averageLength: number; documentFrequency: Map<string, number> }) {
    const uniq = [...new Set(queryTerms)];
    return candidates.map((c) => {
      const tf = new Map<string, number>();
      for (const t of c.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      for (const q of uniq) {
        const f = tf.get(q) ?? 0;
        if (!f) continue;
        const n = stats.documentFrequency.get(q) ?? 0;
        const idf = Math.log(1 + (stats.documentCount - n + 0.5) / (n + 0.5));
        score += idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * (c.terms.length / (stats.averageLength || 1)))));
      }
      return { id: c.id, score };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  }
}
