// Request-level tests for the Fresh web search API handler and Supabase adapters.
// The index under test is populated by the real crawler/parser from a local HTTP fixture; the
// Supabase client is a recording test double (explicit test infrastructure) for adapter contracts.
import assert from "node:assert/strict";
import http from "node:http";
import { PoliteCrawler } from "../src/server/search/crawler.ts";
import { HtmlContentParser } from "../src/server/search/parser.ts";
import { InMemorySearchIndex } from "../src/server/search/memoryIndex.ts";
import { ingestUrl } from "../src/server/search/pipeline.ts";
import { createRateLimiter, handleSearchRequest, validateCitations, SearchProviderError } from "../src/server/search/service.ts";
import { SupabaseEvidenceStore, SupabaseIndexWriter, SupabaseSearchProvider } from "../src/server/search/supabaseAdapters.ts";

let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const page = (t, b, extra = "") => `<!doctype html><html lang="en"><head><title>${t}</title>${extra}</head><body><p>${b}</p></body></html>`;
const server = http.createServer((req, res) => {
  const routes = {
    "/robots.txt": ["text/plain", ""],
    "/reef": ["text/html", page("Reef study", "Coral bleaching is driven by rising ocean temperatures across surveyed reef sites worldwide.", '<meta property="article:published_time" content="2024-05-01T00:00:00Z">')],
    "/tides": ["text/html", page("Tides", "Ocean tides are caused by the gravitational pull of the moon on seawater.")],
  };
  const r = routes[req.url]; if (!r) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": r[0] }); res.end(r[1]);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const index = new InMemorySearchIndex();
const crawler = new PoliteCrawler({ userAgent: "FreshBot-test/1.0", minDelayMs: 0, allowPrivateHosts: true });
for (const p of ["/reef", "/tides"]) assert.equal((await ingestUrl(base + p, { crawler, parser: new HtmlContentParser(), writer: index })).outcome, "indexed");

const user = { id: "user-1" };
const authOk = async (req) => (req.headers.get("authorization") === "Bearer good" ? user : null);
const call = (body, { token = "good", method = "POST", raw, headers = {} } = {}) => new Request("http://x/api/search/query", { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: method === "GET" ? undefined : raw ?? JSON.stringify(body) });
const deps = (over = {}) => ({ authenticate: authOk, provider: index, store: null, ...over });
const run = async (req, d = deps()) => { const res = await handleSearchRequest(req, d); return { status: res.status, json: await res.json() }; };

// --- unauthorized / method / validation
let r = await run(call({ query: "coral" }, { token: null }));
ok(r.status === 401 && r.json.error.code === "unauthorized", "no token -> 401");
r = await run(call({ query: "coral" }, { token: "forged" }));
ok(r.status === 401, "invalid token -> 401");
r = await run(call({ query: "coral" }), deps({ authenticate: async () => { throw new Error("auth outage"); } }));
ok(r.status === 503 && r.json.error.retryable === true, "auth verification outage is 503, not a silent pass");
r = await run(call(null, { method: "GET" }));
ok(r.status === 405, "GET -> 405");
ok((await run(call(null, { raw: "{nope" }))).status === 400, "malformed JSON -> 400");
ok((await run(call([1]))).status === 400 && (await run(call({ query: "" }))).status === 400 && (await run(call({ query: "x".repeat(501) }))).status === 400, "bad query shapes -> 400");
ok((await run(call({ query: "coral", language: "not a tag!" }))).status === 400 && (await run(call({ query: "coral", limit: 99 }))).status === 400, "bad language/limit -> 400");
ok((await run(call(null, { raw: JSON.stringify({ query: "a".repeat(9000) }) }))).status === 413, "oversized body -> 413");
const lim = createRateLimiter(2, 60_000, () => 1000);
const d2 = deps({ limiter: lim });
await run(call({ query: "coral" }), d2); await run(call({ query: "coral" }), d2);
r = await run(call({ query: "coral" }), d2);
ok(r.status === 429 && r.json.error.retryable, "rate limit -> 429");
ok(lim.allow("other-user"), "rate limit is per user");

// --- real retrieval, ranking, evidence
r = await run(call({ query: "coral bleaching ocean temperatures" }));
ok(r.status === 200 && r.json.results[0].url === base + "/reef", "ranked result with real source URL");
ok(r.json.results[0].publishedAt === "2024-05-01T00:00:00.000Z" && r.json.results[0].retrievedAt && r.json.results[0].passages[0].text.includes("Coral bleaching"), "source metadata + passage returned");
ok(r.json.evidence.items.every((i) => i.contentHash.length === 64 && i.sourceUrl.startsWith(base)), "evidence carries hash and source");
ok(r.json.persistence.status === "skipped", "no store configured -> persistence reported as skipped, not persisted");
ok(r.json.warnings.some((w) => /single host/.test(w)), "corroboration warning surfaced");

// --- empty results
r = await run(call({ query: "quantum chromodynamics lattice" }));
ok(r.status === 200 && r.json.results.length === 0 && r.json.evidence.items.length === 0 && r.json.warnings.some((w) => /No indexed source matched/.test(w)), "no match -> empty, honest warning");
r = await run(call({ query: "coral" }), deps({ provider: new InMemorySearchIndex() }));
ok(r.json.results.length === 0 && r.json.warnings.some((w) => /index is empty/.test(w)), "empty index -> explicit warning");
r = await run(call({ query: "a" }));
ok(r.status === 400 && /no searchable terms/.test(r.json.error.message), "query without searchable terms -> 400");

// --- source failures
const failing = (e) => ({ id: "x", search: async () => { throw e; } });
r = await run(call({ query: "coral" }), deps({ provider: failing(new SearchProviderError("index_unavailable", "x", true)) }));
ok(r.status === 503 && r.json.error.code === "index_unavailable", "index not installed -> 503");
r = await run(call({ query: "coral" }), deps({ provider: failing(new Error("connection reset")) }));
ok(r.status === 502 && r.json.error.code === "provider_failed" && !JSON.stringify(r.json).includes("connection reset"), "provider failure -> 502 without leaking internals");

// --- Supabase adapter: malformed responses, missing function, grouping
const dbWith = (data, error = null) => ({ rpc: async () => ({ data, error }), from: () => ({ upsert: async () => ({ error: null }) }) });
for (const [label, bad] of [["non-array", { rows: [] }], ["wrong field type", [{ document_id: 1 }]], ["missing fields", [{ document_id: "d", canonical_url: "https://a.test" }]], ["NaN rank", [row({ rank: NaN })]]]) {
  r = await run(call({ query: "coral" }), deps({ provider: new SupabaseSearchProvider(dbWith(bad)) }));
  ok(r.status === 502 && r.json.error.code === "provider_malformed", `malformed backend response (${label}) -> 502`);
}
function row(o = {}) { return { document_id: "doc-1", canonical_url: "https://a.test/x", title: "A", language: "en", published_at: null, last_fetched_at: "2026-10-24T00:00:00Z", content_hash: "a".repeat(64), passage_id: "p-1", ordinal: 0, body: "Coral bleaching passage text.", rank: 0.5, ...o }; }
r = await run(call({ query: "coral" }), deps({ provider: new SupabaseSearchProvider(dbWith(null, { message: 'Could not find the function public.search_fresh_web_passages', code: "PGRST202" })) }));
ok(r.status === 503 && r.json.error.code === "index_unavailable", "migration not applied -> 503 index_unavailable");
r = await run(call({ query: "coral" }), deps({ provider: new SupabaseSearchProvider(dbWith(null, { message: "timeout" })) }));
ok(r.status === 502, "database error -> 502");
const grouped = await new SupabaseSearchProvider(dbWith([row({ passage_id: "p-1", rank: 0.2 }), row({ passage_id: "p-2", ordinal: 1, body: "Second coral passage here.", rank: 0.9 }), row({ document_id: "doc-2", canonical_url: "https://b.test/y", passage_id: "p-3", rank: 0.5 })])).search({ text: "coral" });
ok(grouped.hits.length === 2 && grouped.hits[0].documentId === "doc-1" && grouped.hits[0].score === 0.9 && grouped.hits[0].passages.length === 2, "rows grouped per document, ranked by best passage");

// --- citation validation
const hit = { documentId: "d", canonicalUrl: "https://a.test/x", title: "A", language: "en", publishedAt: null, fetchedAt: "2026-10-24T00:00:00Z", contentHash: "a".repeat(64), score: 1, passages: [{ passageId: "p", ordinal: 0, text: "Real passage text here.", score: 1 }] };
const item = (o = {}) => ({ evidenceId: "p", sourceUrl: "https://a.test/x", sourceTitle: "A", passage: "Real passage text here.", passageOrdinal: 0, contentHash: "a".repeat(64), publishedAt: null, retrievedAt: "2026-10-24T00:00:00Z", language: "en", queryTermCoverage: 1, support: "unknown", ...o });
ok(validateCitations([item()], [hit]).valid.length === 1, "valid citation accepted");
for (const [label, o] of [["javascript url", { sourceUrl: "javascript:alert(1)" }], ["url not in results", { sourceUrl: "https://evil.test/z" }], ["fabricated passage", { passage: "Invented quote" }], ["empty passage", { passage: "  " }], ["bad hash", { contentHash: "xyz" }], ["bad retrieval date", { retrievedAt: "yesterday" }], ["bad publish date", { publishedAt: "soon" }]]) {
  ok(validateCitations([item(o)], [hit]).rejected === 1, `citation rejected: ${label}`);
}
const tampered = { id: "t", search: async () => ({ query: "q", hits: [{ ...hit, canonicalUrl: "javascript:alert(1)" }], totalCandidates: 1, indexedDocuments: 1, tookMs: 0 }) };
r = await run(call({ query: "real passage" }), deps({ provider: tampered }));
ok(r.status === 200 && r.json.results.length === 0 && r.json.evidence.items.length === 0 && r.json.warnings.some((w) => /failed citation validation/.test(w)), "end-to-end: invalid-URL hit is withheld and reported");

// --- persistence
const calls = [];
const recordingDb = (failOn) => ({ rpc: async () => ({ data: null, error: null }), from: (t) => ({ upsert: async (rows, opts) => { calls.push({ t, rows, opts }); return { error: t === failOn ? { message: "db down" } : null }; } }) });
r = await run(call({ query: "coral bleaching ocean temperatures" }), deps({ store: new SupabaseEvidenceStore(recordingDb()) }));
ok(r.json.persistence.status === "persisted" && r.json.persistence.evidence >= 1, "evidence persisted");
const ev = calls.find((c) => c.t === "fresh_intelligence_evidence"), src = calls.find((c) => c.t === "fresh_intelligence_sources");
ok(ev.opts.onConflict === "id" && src.opts.onConflict === "id", "idempotent upserts");
ok(ev.rows.every((e) => e.provider === "fresh-web-index" && e.supports === null && e.confidence === null && e.source_url.startsWith(base) && e.claim_text && e.observed_at), "persisted evidence never asserts stance or confidence");
ok(ev.rows.every((e) => src.rows.some((s) => s.id === e.source_id)), "every evidence row links to a persisted source");
calls.length = 0;
r = await run(call({ query: "coral bleaching ocean temperatures" }), deps({ store: new SupabaseEvidenceStore(recordingDb("fresh_intelligence_evidence")) }));
ok(r.status === 200 && r.json.results.length > 0 && r.json.persistence.status === "failed" && r.json.persistence.error.code === "persistence_failed" && !JSON.stringify(r.json).includes("db down"), "persistence failure: results still returned, failure reported, no internals leaked");
r = await run(call({ query: "coral bleaching ocean temperatures" }), deps({ store: { persist: async () => { throw new Error("boom"); } } }));
ok(r.json.persistence.status === "failed" && r.json.warnings.some((w) => /could not be saved/.test(w)), "store exception -> failed + warning");
calls.length = 0;
r = await run(call({ query: "zzzz nothing here" }), deps({ store: new SupabaseEvidenceStore(recordingDb()) }));
ok(r.json.persistence.status === "skipped" && calls.length === 0, "nothing persisted when there is no evidence");
await run(call({ query: "coral" }, { token: null }), deps({ store: new SupabaseEvidenceStore(recordingDb()) }));
ok(calls.length === 0, "unauthorized request never reaches persistence");

// --- index writer adapter
const wcalls = [];
const wdb = { rpc: async (fn, args) => { wcalls.push({ fn, args }); return { data: fn === "upsert_fresh_web_document" ? { document_id: "doc", version: 2, status: "indexed" } : true, error: null }; }, from: () => ({}) };
const writer = new SupabaseIndexWriter(wdb);
const parsed = new HtmlContentParser().parse({ requestedUrl: base + "/reef", finalUrl: base + "/reef", status: 200, contentType: "text/html", body: page("T", "A sentence long enough to become a passage here."), fetchedAt: "2026-10-24T00:00:00Z" });
const v = await writer.upsert(parsed, { fetchedAt: "2026-10-24T00:00:00Z", sourceUrl: base + "/reef" });
ok(v.version === 2 && wcalls[0].args.p.content_hash.length === 64 && wcalls[0].args.p.passages.length === parsed.passages.length, "index writer calls atomic RPC with hash and passages");
ok(await writer.markRemoved(base + "/reef") === true, "markRemoved via RPC");
await assert.rejects(new SupabaseIndexWriter({ rpc: async () => ({ data: { weird: 1 }, error: null }), from: () => ({}) }).upsert(parsed, { fetchedAt: "2026-10-24T00:00:00Z", sourceUrl: "x" }), /unexpected shape/); checks++;

server.close();
console.log(`Fresh web search API: PASS (${checks} checks)`);
