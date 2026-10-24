import type { EvidenceBundle, IndexedDocumentVersion, IndexWriter, ParsedDocument, SearchHit, SearchProvider, SearchQuery, SearchResponse } from "./contracts.js";
import { SearchProviderError, type AuthUser, type EvidenceStore } from "./service.js";
import { sha256Hex } from "./url.js";

type DbError = { message: string; code?: string } | null;
/** The slice of supabase-js these adapters use; satisfied by SupabaseClient and by test doubles. */
export interface SupabaseLike {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: DbError }>;
  from(table: string): { upsert(rows: unknown, options?: { onConflict?: string }): PromiseLike<{ error: DbError }> };
}

const MISSING_FN = /could not find the function|does not exist|PGRST202|42883/i;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

interface PassageRow {
  document_id: string; canonical_url: string; title: string; language: string | null; published_at: string | null;
  last_fetched_at: string; content_hash: string; passage_id: string; ordinal: number; body: string; rank: number;
}

function parseRows(data: unknown): PassageRow[] {
  if (!Array.isArray(data)) throw new SearchProviderError("malformed_response", "search_fresh_web_passages did not return an array", true);
  return data.map((r, i) => {
    if (!isObj(r)
      || typeof r.document_id !== "string" || typeof r.canonical_url !== "string" || typeof r.title !== "string"
      || (r.language !== null && typeof r.language !== "string") || (r.published_at !== null && typeof r.published_at !== "string")
      || typeof r.last_fetched_at !== "string" || typeof r.content_hash !== "string" || typeof r.passage_id !== "string"
      || typeof r.ordinal !== "number" || typeof r.body !== "string" || typeof r.rank !== "number" || !Number.isFinite(r.rank)) {
      throw new SearchProviderError("malformed_response", `Row ${i} has an unexpected shape`, true);
    }
    return r as unknown as PassageRow;
  });
}

/** SearchProvider backed by the Postgres full-text RPC (service-role client; the RPC is not callable by clients). */
export class SupabaseSearchProvider implements SearchProvider {
  readonly id = "fresh-postgres-fts";
  private db: SupabaseLike;
  constructor(db: SupabaseLike) { this.db = db; }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const started = Date.now();
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 25);
    // Fetch extra passage rows so several passages per document can be grouped.
    const res = await this.db.rpc("search_fresh_web_passages", { p_query: query.text, p_limit: Math.min(limit * 3, 50), p_language: query.language ?? null });
    if (res.error) {
      if (MISSING_FN.test(`${res.error.code ?? ""} ${res.error.message}`)) throw new SearchProviderError("index_unavailable", "Fresh web index functions are not installed", true);
      throw new SearchProviderError("provider_failed", res.error.message, true);
    }
    const rows = parseRows(res.data);
    const byDoc = new Map<string, SearchHit>();
    for (const r of rows) {
      let hit = byDoc.get(r.document_id);
      if (!hit) {
        hit = { documentId: r.document_id, canonicalUrl: r.canonical_url, title: r.title, language: r.language, publishedAt: r.published_at, fetchedAt: r.last_fetched_at, contentHash: r.content_hash, score: r.rank, passages: [] };
        byDoc.set(r.document_id, hit);
      }
      hit.score = Math.max(hit.score, r.rank);
      if (hit.passages.length < 3) hit.passages.push({ passageId: r.passage_id, ordinal: r.ordinal, text: r.body, score: r.rank });
    }
    const hits = [...byDoc.values()].sort((a, b) => b.score - a.score).slice(0, limit);
    let indexedDocuments: number | null = null;
    if (!hits.length) {
      const stats = await this.db.rpc("fresh_web_index_stats");
      if (!stats.error && isObj(stats.data) && typeof stats.data.documents === "number") indexedDocuments = stats.data.documents;
    }
    return { query: query.text, hits, totalCandidates: rows.length, indexedDocuments, tookMs: Date.now() - started };
  }
}

/** IndexWriter backed by the atomic upsert RPCs (service role only). */
export class SupabaseIndexWriter implements IndexWriter {
  private db: SupabaseLike;
  constructor(db: SupabaseLike) { this.db = db; }

  async upsert(doc: ParsedDocument, meta: { fetchedAt: string; sourceUrl: string }): Promise<IndexedDocumentVersion> {
    const contentHash = doc.contentHash || (await sha256Hex(doc.text));
    const res = await this.db.rpc("upsert_fresh_web_document", { p: {
      canonical_url: doc.canonicalUrl, host: new URL(doc.canonicalUrl).hostname, title: doc.title, language: doc.language,
      published_at: doc.publishedAt, content_hash: contentHash, fetched_at: meta.fetchedAt,
      passages: doc.passages.map((p) => ({ ordinal: p.ordinal, text: p.text })),
    } });
    if (res.error) throw new Error(`upsert_fresh_web_document failed: ${res.error.message}`);
    const d = res.data;
    if (!isObj(d) || typeof d.document_id !== "string" || typeof d.version !== "number" || (d.status !== "indexed" && d.status !== "unchanged")) {
      throw new Error("upsert_fresh_web_document returned an unexpected shape");
    }
    return { documentId: d.document_id, version: d.version, canonicalUrl: doc.canonicalUrl, contentHash, fetchedAt: meta.fetchedAt, status: d.status };
  }

  async markRemoved(canonicalUrl: string): Promise<boolean> {
    const res = await this.db.rpc("mark_fresh_web_document_removed", { p_url: canonicalUrl });
    if (res.error) throw new Error(`mark_fresh_web_document_removed failed: ${res.error.message}`);
    return res.data === true;
  }
}

/**
 * Persists retrieved evidence into the EXISTING Fresh Intelligence tables (no parallel copy).
 * Rows are public-web passages, so they carry no user data; the schema has no per-user research-run
 * ownership column, so the authenticated user only gates WHO may trigger persistence (see docs).
 * `supports` and `confidence` stay null: retrieval does not establish stance.
 */
export class SupabaseEvidenceStore implements EvidenceStore {
  private db: SupabaseLike;
  constructor(db: SupabaseLike) { this.db = db; }

  async persist(_user: AuthUser, bundle: EvidenceBundle, hits: SearchHit[]): Promise<{ sources: number; evidence: number }> {
    const hitByUrl = new Map(hits.map((h) => [h.canonicalUrl, h]));
    const sources = [...new Map(bundle.items.map((i) => [i.sourceUrl, i])).values()].map((i) => ({
      id: `web-source-${hitByUrl.get(i.sourceUrl)?.documentId ?? i.contentHash.slice(0, 32)}`, title: i.sourceTitle, url: i.sourceUrl, source_type: "web",
      metadata: { provider: "fresh-web-index", contentHash: i.contentHash, language: i.language, retrievedAt: i.retrievedAt },
    }));
    const evidence = bundle.items.map((i) => ({
      id: `web-evidence-${i.evidenceId.replace(/[^a-zA-Z0-9:-]/g, "")}`,
      claim_text: i.passage, source_id: `web-source-${hitByUrl.get(i.sourceUrl)?.documentId ?? i.contentHash.slice(0, 32)}`,
      source_url: i.sourceUrl, source_title: i.sourceTitle, provider: "fresh-web-index",
      observed_at: i.retrievedAt, published_at: i.publishedAt, confidence: null, supports: null,
    }));
    const s = await this.db.from("fresh_intelligence_sources").upsert(sources, { onConflict: "id" });
    if (s.error) throw new Error(`sources upsert failed: ${s.error.message}`);
    const e = await this.db.from("fresh_intelligence_evidence").upsert(evidence, { onConflict: "id" });
    if (e.error) throw new Error(`evidence upsert failed: ${e.error.message}`);
    return { sources: sources.length, evidence: evidence.length };
  }
}
