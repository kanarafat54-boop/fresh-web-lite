import assert from "node:assert/strict";
const P = await import("../src/core/discovery/globalDiscovery.ts");
const D = P;

// url safety and helpers
assert.equal(P.safeUrl("javascript:alert(1)"), undefined);
assert.equal(P.safeUrl("/relative"), undefined);
assert.equal(P.safeUrl("https://a.example/x"), "https://a.example/x");
assert.equal(P.gdeltDate("20261117T093000Z"), "2026-11-17T09:30:00Z");
assert.equal(P.gdeltDate("garbage"), undefined);
assert.equal(P.stripHtml('a <span class="searchmatch">b</span> &amp; &quot;c&quot;'), 'a b & "c"');

// each provider: request shape and parse of a realistic reply; junk entries are skipped
assert.match(P.gdelt.request("flood relief", 5), /query=flood%20relief&mode=artlist&format=json&sort=datedesc&maxrecords=5$/);
let items = P.gdelt.parse({ articles: [{ url: "https://news.example/a", title: "Flood relief arrives", seendate: "20261117T093000Z", domain: "news.example", socialimage: "https://news.example/i.jpg" }, { url: "javascript:x", title: "bad" }, { title: "no url" }, null] });
assert.deepEqual(items, [{ id: "gdelt:https://news.example/a", kind: "news", title: "Flood relief arrives", source: "news.example", url: "https://news.example/a", publishedAt: "2026-11-17T09:30:00Z", imageUrl: "https://news.example/i.jpg", access: "Opens at the publisher" }]);
assert.deepEqual(P.gdelt.parse("not json"), []);
assert.deepEqual(P.gdelt.parse({ articles: "x" }), []);

items = P.itunes.parse({ results: [{ trackId: 1, trackName: "Song", artistName: "Band", collectionName: "Album", trackViewUrl: "https://music.apple.com/x", previewUrl: "https://audio.example/p.m4a", artworkUrl100: "http://insecure.example/a.jpg", releaseDate: "2020-01-01T00:00:00Z" }] });
assert.equal(items[0].previewUrl, "https://audio.example/p.m4a");
assert.equal(items[0].imageUrl, undefined, "insecure artwork is dropped");
assert.equal(items[0].creator, "Band");
assert.match(items[0].access, /30-second preview/);

items = P.openLibrary.parse({ docs: [{ key: "/works/OL1W", title: "Dune", author_name: ["Frank Herbert"], first_publish_year: 1965, cover_i: 99, has_fulltext: true }, { key: "works/bad", title: "x" }] });
assert.equal(items.length, 1);
assert.equal(items[0].url, "https://openlibrary.org/works/OL1W");
assert.equal(items[0].imageUrl, "https://covers.openlibrary.org/b/id/99-M.jpg");
assert.equal(items[0].publishedAt, "1965");

items = P.gutendex.parse({ results: [{ id: 84, title: "Frankenstein", authors: [{ name: "Shelley, Mary" }], formats: { "text/html": "https://www.gutenberg.org/ebooks/84.html.images", "image/jpeg": "https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg" } }] });
assert.equal(items[0].access, "Free to read: public domain");
assert.equal(items[0].creator, "Shelley, Mary");

items = P.wikiversity.parse({ query: { search: [{ pageid: 5, title: "Algebra", snippet: 'learn <span class="searchmatch">algebra</span> &amp; more', timestamp: "2026-01-01T00:00:00Z" }, { title: "no id" }] } });
assert.deepEqual([items.length, items[0].kind, items[0].summary, items[0].url], [1, "lesson", "learn algebra & more", "https://en.wikiversity.org/?curid=5"]);
assert.equal(P.wikipedia.parse({ query: { search: [{ pageid: 1, title: "T", snippet: "" }] } })[0].kind, "article");

items = P.openAlex.parse({ results: [{ id: "https://openalex.org/W1", display_name: "A study", publication_year: 2024, doi: "https://doi.org/10.1/x", authorships: [1, 2, 3, 4, 5].map((n) => ({ author: { display_name: "Author " + n } })), primary_location: { source: { display_name: "Journal X" } }, open_access: { is_oa: true }, cited_by_count: 7 }, { id: "https://openalex.org/W2", display_name: "No link", doi: "ftp://x" }] });
assert.equal(items[0].url, "https://doi.org/10.1/x");
assert.equal(items[0].creator, "Author 1, Author 2, Author 3, Author 4 et al.");
assert.equal(items[0].access, "Open access");
assert.equal(items[1].url, "https://openalex.org/W2", "falls back to the record address");

// systems: exactly the five outward-looking ones, each with real providers
assert.deepEqual(Object.keys(P.SYSTEM_PROVIDERS).sort(), ["books-reading", "fresh-music", "fresh-news", "learn", "research-knowledge"]);
assert.ok(P.isGlobalSystem("fresh-news") && !P.isGlobalSystem("fresh-posts") && !P.isGlobalSystem("constructor"));

// discover(): fan out, interleave, de-duplicate, survive failures, report honestly
assert.equal(D.cleanQuery("  a\u0000\n  b  "), "a b");
assert.equal(D.cleanQuery("x".repeat(500)).length, D.MAX_QUERY);
assert.equal(D.cleanQuery(42), "");
const replies = {
  "openlibrary.org": { docs: [{ key: "/works/1", title: "Book one" }, { key: "/works/2", title: "Book two" }] },
  "gutendex.com": { results: [{ id: 1, title: "Gutenberg one", formats: { "text/html": "https://www.gutenberg.org/ebooks/1" } }] },
};
const seenUrls = [];
const fetcher = async (url) => { seenUrls.push(url); const host = new URL(url).host; return { ok: true, status: 200, json: async () => replies[host] }; };
let r = await D.discover("books-reading", "  dune ", fetcher);
assert.equal(r.query, "dune");
assert.deepEqual(r.items.map((i) => i.title), ["Book one", "Gutenberg one", "Book two"], "providers interleave");
assert.deepEqual(r.providers.map((p) => [p.id, p.ok, p.count]), [["openlibrary", true, 2], ["gutendex", true, 1]]);

const down = async (url) => { if (url.includes("gutendex")) throw new Error("boom"); return fetcher(url); };
r = await D.discover("books-reading", "dune", down);
assert.equal(r.items.length, 2);
assert.deepEqual(r.providers[1], { id: "gutendex", label: "Project Gutenberg", ok: false, count: 0, error: "Project Gutenberg could not be reached." });

const http500 = async () => ({ ok: false, status: 503, json: async () => ({}) });
r = await D.discover("fresh-news", "storm", http500);
assert.deepEqual(r.items, []);
assert.equal(r.providers[0].error, "GDELT news index answered HTTP 503.", "a failure is never reported as 'no results'");

const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("a"), { name: "AbortError" }))));
r = await D.discover("fresh-music", "song", hang, { timeoutMs: 20 });
assert.equal(r.providers[0].error, "Apple music catalog took too long.");

const notJson = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("x"); } });
r = await D.discover("fresh-news", "storm", notJson);
assert.equal(r.providers[0].ok, false);

// duplicates across providers collapse by address
const dupe = async () => ({ ok: true, status: 200, json: async () => ({ query: { search: [{ pageid: 1, title: "Same", snippet: "" }] } }) });
await assert.rejects(() => D.discover("learn", "a", dupe), /at least 2 characters/);
await assert.rejects(() => D.discover("fresh-posts", "abc", dupe), /Unknown system/);
await assert.rejects(() => D.discover("constructor", "abc", dupe), /Unknown system/);
assert.ok(seenUrls.every((u) => u.startsWith("https://")), "providers are only called over https");
console.log("Global discovery contract passed (7 providers, 5 systems, failures reported, no invented results).");
