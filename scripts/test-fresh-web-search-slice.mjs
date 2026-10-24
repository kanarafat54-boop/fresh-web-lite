// End-to-end test of the Fresh web search slice against a real local HTTP server
// (explicit test infrastructure: no external network). Exercises the real crawler, robots,
// parser, indexer, BM25 ranking, evidence service, refresh and removal paths.
import assert from "node:assert/strict";
import http from "node:http";
import { PoliteCrawler } from "../src/server/search/crawler.ts";
import { HtmlContentParser } from "../src/server/search/parser.ts";
import { InMemorySearchIndex } from "../src/server/search/memoryIndex.ts";
import { IndexEvidenceService } from "../src/server/search/evidence.ts";
import { ingestUrl } from "../src/server/search/pipeline.ts";
import { canonicalizeUrl, isPrivateOrInternalHost } from "../src/server/search/url.ts";
import { parseRobots, isAllowed } from "../src/server/search/robots.ts";

const page = (title, body, extra = "", lang = "en") => `<!doctype html><html lang="${lang}"><head><title>${title}</title>${extra}</head><body><script>var x="ignored secret";</script><article>${body}</article></body></html>`;
let hits = {};
const state = { v2: false, flaky: 0 };
const routes = {
  "/robots.txt": () => [200, "text/plain", "User-agent: *\nDisallow: /private\nCrawl-delay: 0\n"],
  "/a": () => [200, "text/html", page("Coral reef bleaching", "<p>Coral bleaching happens when ocean temperatures rise above normal for weeks. Mass bleaching events were recorded in 2016 and 2024.</p><p>Unrelated paragraph about gardening tomatoes in spring.</p>", '<meta property="article:published_time" content="2024-05-01T00:00:00Z">')],
  "/b": () => [200, "text/html", page("Reef temperature study", "<p>Rising ocean temperatures are the main driver of coral bleaching according to this survey of reef sites.</p>")],
  "/dup": () => [200, "text/html", page("Coral reef bleaching", "<p>Coral bleaching happens when ocean temperatures rise above normal for weeks. Mass bleaching events were recorded in 2016 and 2024.</p><p>Unrelated paragraph about gardening tomatoes in spring.</p>")],
  "/fr": () => [200, "text/html", page("Blanchiment du corail", "<p>Le blanchiment du corail est provoqué par la hausse de la température de la mer.</p>", "", "fr")],
  "/private/x": () => [200, "text/html", page("Secret", "<p>Should never be indexed because robots disallows it entirely.</p>")],
  "/noindex": () => [200, "text/html", page("Hidden", "<p>Page asks not to be indexed by anyone at all.</p>", '<meta name="robots" content="noindex">')],
  "/changing": () => [200, "text/html", page("Changing", state.v2 ? "<p>Version two talks about volcanoes and lava flows in detail.</p>" : "<p>Version one talks about glaciers and ice sheets in detail.</p>")],
  "/flaky": () => (state.flaky++ < 2 ? [503, "text/plain", "busy"] : [200, "text/html", page("Flaky recovered", "<p>The flaky page finally answered after two failures happened.</p>")]),
  "/gone": () => [state.gone ? 410 : 200, "text/html", page("Gone soon", "<p>This page will be removed from the web shortly after indexing.</p>")],
  "/pdf": () => [200, "application/pdf", "%PDF"],
  "/big": () => [200, "text/html", "x".repeat(5000)],
  "/redir": () => [302, "text/html", "", { location: "/a" }],
};
const server = http.createServer((req, res) => {
  hits[req.url] = (hits[req.url] ?? 0) + 1;
  const r = routes[req.url.split("?")[0]];
  if (!r) { res.writeHead(404); return res.end("nf"); }
  const [status, type, body, extra = {}] = r();
  res.writeHead(status, { "content-type": type, ...extra }); res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const crawler = new PoliteCrawler({ userAgent: "FreshBot-test/1.0", minDelayMs: 0, maxBytes: 4000, allowPrivateHosts: true });
const index = new InMemorySearchIndex();
const deps = { crawler, parser: new HtmlContentParser(), writer: index };
const noSleep = { sleep: async () => {}, backoffMs: 0 };
const ingest = (p) => ingestUrl(base + p, deps, noSleep);
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };

// unit-level
ok(canonicalizeUrl("HTTP://Example.COM:80/a/?utm_source=x&b=2&a=1#frag") === "http://example.com/a?a=1&b=2", "canonicalization");
ok(isPrivateOrInternalHost("169.254.169.254") && isPrivateOrInternalHost("localhost") && !isPrivateOrInternalHost("example.com"), "ssrf host guard");
const r = parseRobots("User-agent: *\nDisallow: /a\nAllow: /a/ok\nUser-agent: FreshBot\nDisallow: /fb$");
ok(isAllowed(r, "other", "/a/ok") && !isAllowed(r, "other", "/a/no") && !isAllowed(r, "FreshBot/1", "/fb") && isAllowed(r, "FreshBot/1", "/fbx"), "robots longest-match + agent groups");
const strict = new PoliteCrawler({ userAgent: "FreshBot-test/1.0", minDelayMs: 0 });
ok((await strict.fetch(base + "/a")).outcome === "blocked_by_policy", "loopback blocked by default (SSRF)");

// ingestion outcomes
const reports = {};
for (const p of ["/a", "/b", "/dup", "/fr", "/private/x", "/noindex", "/changing", "/flaky", "/gone", "/pdf", "/big", "/missing", "/redir"]) reports[p] = await ingest(p);
ok(reports["/a"].outcome === "indexed" && reports["/b"].outcome === "indexed" && reports["/fr"].outcome === "indexed", "real pages indexed");
ok(reports["/private/x"].outcome === "blocked_by_robots" && hits["/private/x"] === undefined, "robots disallow honoured without fetching page");
ok(reports["/noindex"].outcome === "noindex", "noindex honoured");
ok(reports["/flaky"].outcome === "indexed" && reports["/flaky"].attempts === 3, "retry with backoff recovers from 503");
ok(reports["/pdf"].outcome === "unsupported_content_type" && reports["/big"].outcome === "too_large", "type and size limits");
ok(reports["/missing"].error?.retryable === false && reports["/missing"].attempts === 1, "404 not retried");
ok(reports["/redir"].outcome === "unchanged", "redirect resolves to canonical /a (dedup, no new version)");
ok(index.liveCount === 7, `live docs = ${index.liveCount}`);

// search + ranking + passages
const res = await index.search({ text: "coral bleaching ocean temperatures" });
ok(res.hits.length >= 2 && ["/a", "/b", "/dup"].some((p) => res.hits[0].canonicalUrl.endsWith(p)), "relevant doc ranks first");
ok(!res.hits.some((h) => h.canonicalUrl.endsWith("/private/x") || h.canonicalUrl.endsWith("/noindex")), "excluded pages never retrievable");
ok(res.hits[0].passages[0].text.toLowerCase().includes("bleaching"), "best passage is the relevant one, not gardening");
ok(!(await index.search({ text: "ignored secret" })).hits.length, "script content not indexed");
ok((await index.search({ text: "coral", language: "fr" })).hits.every((h) => h.language === "fr"), "language filter");
ok((await index.search({ text: "blanchiment corail" })).hits[0].canonicalUrl.endsWith("/fr"), "non-English retrieval");
ok((await index.search({ text: "zzzznotaword" })).hits.length === 0, "no-match returns empty, not fabricated");

// evidence
const evidence = await new IndexEvidenceService(index).gather("coral bleaching ocean temperatures", { maxItems: 5 });
ok(evidence.items.length > 0 && evidence.items.every((e) => e.sourceUrl.startsWith(base) && e.retrievedAt && e.passage && e.contentHash), "evidence has source, passage, hash, retrieval date");
ok(evidence.items.some((e) => e.publishedAt === "2024-05-01T00:00:00.000Z"), "publication date preserved");
ok(evidence.items.every((e) => e.support === "unknown" || e.queryTermCoverage === 1), "no stance asserted beyond lexical coverage");
ok(evidence.warnings.some((w) => /single host/.test(w)), "single-host corroboration warning");
ok(evidence.duplicateGroups.length === 0 || evidence.duplicateGroups[0].urls.length > 1, "duplicate grouping shape");
const dupQ = await new IndexEvidenceService(index).gather("mass bleaching events recorded 2016", { maxItems: 5 });
ok(dupQ.duplicateGroups.length === 1 && dupQ.duplicateGroups[0].urls.length === 2 && dupQ.independentSourceCount < dupQ.items.length + 1, "identical pages (/a,/dup) flagged as non-independent");
const empty = await new IndexEvidenceService(new InMemorySearchIndex()).gather("anything");
ok(empty.items.length === 0 && empty.warnings[0].includes("empty"), "empty index reports partial result");
const failing = await new IndexEvidenceService({ id: "boom", search: async () => { throw new Error("down"); } }).gather("provider outage");
ok(failing.items.length === 0 && /failed/.test(failing.warnings[0]), "provider failure -> structured warning");

// refresh + removal
const v1 = index.versionOf(canonicalizeUrl(base + "/changing"));
state.v2 = true; state.gone = true;
ok((await ingest("/changing")).outcome === "indexed" && index.versionOf(canonicalizeUrl(base + "/changing")) === v1 + 1, "changed content creates a new version");
ok((await ingest("/changing")).outcome === "unchanged", "unchanged content not re-versioned");
ok((await index.search({ text: "volcanoes lava" })).hits.length === 1 && !(await index.search({ text: "glaciers" })).hits.length, "refresh replaces old content");
ok((await ingest("/gone")).outcome === "removed" && !(await index.search({ text: "shortly after indexing" })).hits.some((h) => h.canonicalUrl.endsWith("/gone")), "410 removes document from results");

server.close();
console.log(`Fresh web search slice end-to-end: PASS (${checks} checks, ${index.liveCount} live docs)`);
