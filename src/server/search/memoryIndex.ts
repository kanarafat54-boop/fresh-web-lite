import type { IndexedDocumentVersion, IndexWriter, ParsedDocument, RankingEngine, SearchProvider, SearchQuery, SearchResponse } from "./contracts.js";
import { sha256Hex } from "./url.js";
import { tokenize } from "./parser.js";
import { Bm25RankingEngine } from "./ranking.js";

interface StoredDoc { documentId: string; version: number; doc: ParsedDocument; fetchedAt: string; removed: boolean; terms: string[]; passageTerms: string[][] }

/**
 * Process-local index implementing IndexWriter + SearchProvider. Used for tests and as the
 * reference semantics for the Postgres adapter (supabase migration 20261024090000). It is NOT
 * a production persistence layer: state is lost when the process exits.
 */
export class InMemorySearchIndex implements IndexWriter, SearchProvider {
  readonly id = "fresh-memory-index";
  private docs = new Map<string, StoredDoc>();
  private ranking: RankingEngine;
  constructor(ranking: RankingEngine = new Bm25RankingEngine()) { this.ranking = ranking; }

  async upsert(doc: ParsedDocument, meta: { fetchedAt: string }): Promise<IndexedDocumentVersion> {
    const contentHash = doc.contentHash || (await sha256Hex(doc.text));
    const existing = this.docs.get(doc.canonicalUrl);
    const documentId = existing?.documentId ?? (await sha256Hex(doc.canonicalUrl)).slice(0, 32);
    if (existing && !existing.removed && existing.doc.contentHash === contentHash) {
      existing.fetchedAt = meta.fetchedAt;
      return { documentId, version: existing.version, canonicalUrl: doc.canonicalUrl, contentHash, fetchedAt: meta.fetchedAt, status: "unchanged" };
    }
    const version = (existing?.version ?? 0) + 1;
    const stored = { ...doc, contentHash };
    this.docs.set(doc.canonicalUrl, { documentId, version, doc: stored, fetchedAt: meta.fetchedAt, removed: false, terms: tokenize(`${doc.title} ${doc.text}`), passageTerms: doc.passages.map((p) => tokenize(p.text)) });
    return { documentId, version, canonicalUrl: doc.canonicalUrl, contentHash, fetchedAt: meta.fetchedAt, status: "indexed" };
  }

  async markRemoved(canonicalUrl: string): Promise<boolean> {
    const d = this.docs.get(canonicalUrl);
    if (!d || d.removed) return false;
    d.removed = true;
    return true;
  }

  get liveCount(): number { return [...this.docs.values()].filter((d) => !d.removed).length; }
  versionOf(canonicalUrl: string): number | undefined { return this.docs.get(canonicalUrl)?.version; }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const started = Date.now();
    const terms = tokenize(query.text);
    const live = [...this.docs.values()].filter((d) => !d.removed && (!query.language || d.doc.language?.startsWith(query.language.toLowerCase())));
    const df = new Map<string, number>();
    for (const d of live) for (const t of new Set(d.terms)) df.set(t, (df.get(t) ?? 0) + 1);
    const avg = live.reduce((n, d) => n + d.terms.length, 0) / (live.length || 1);
    const ranked = this.ranking.rank(terms, live.map((d) => ({ id: d.documentId, terms: d.terms })), { documentCount: live.length, averageLength: avg, documentFrequency: df });
    const byId = new Map(live.map((d) => [d.documentId, d]));
    const hits = ranked.slice(0, Math.min(Math.max(query.limit ?? 10, 1), 50)).map((r) => {
      const d = byId.get(r.id)!;
      const pdf = new Map<string, number>();
      for (const pt of d.passageTerms) for (const t of new Set(pt)) pdf.set(t, (pdf.get(t) ?? 0) + 1);
      const pAvg = d.passageTerms.reduce((n, p) => n + p.length, 0) / (d.passageTerms.length || 1);
      const pr = this.ranking.rank(terms, d.passageTerms.map((t, i) => ({ id: String(i), terms: t })), { documentCount: d.passageTerms.length, averageLength: pAvg, documentFrequency: pdf }).slice(0, 3);
      return {
        documentId: d.documentId, canonicalUrl: d.doc.canonicalUrl, title: d.doc.title, language: d.doc.language, publishedAt: d.doc.publishedAt,
        fetchedAt: d.fetchedAt, contentHash: d.doc.contentHash, score: r.score,
        passages: pr.map((p) => ({ passageId: `${d.documentId}:${d.version}:${p.id}`, ordinal: Number(p.id), text: d.doc.passages[Number(p.id)].text, score: p.score })),
      };
    });
    return { query: query.text, hits, totalCandidates: ranked.length, indexedDocuments: live.length, tookMs: Date.now() - started };
  }
}
