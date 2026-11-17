import assert from "node:assert/strict";
const P = await import("../src/core/discovery/globalDiscovery.ts");
const D = P;

// url safety and text helpers
assert.equal(P.safeUrl("javascript:alert(1)"), undefined);
assert.equal(P.safeUrl("/relative"), undefined);
assert.equal(P.safeUrl("https://a.example/x"), "https://a.example/x");
assert.equal(P.gdeltDate("20261117T093000Z"), "2026-11-17T09:30:00Z");
assert.equal(P.gdeltDate("garbage"), undefined);
assert.equal(P.stripHtml('a <span class="searchmatch">b</span> &amp; &quot;c&quot;'), 'a b & "c"');
assert.equal(P.stripHtml("x < y and z > w"), "x < y and z > w", "only real tags are removed");
assert.equal(P.decodeEntities("&amp;lt; &#65;&#x42; &nbsp;|"), "&lt; AB  |", "&amp; is decoded last, numeric entities are decoded");
assert.equal(P.decodeEntities("&#99999999999;"), "", "an impossible code point is dropped, not thrown");

// each JSON provider: request shape and parse of a realistic reply; junk entries are skipped
assert.match(P.gdelt.request("flood relief", 5), /query=flood%20relief&mode=artlist&format=json&sort=datedesc&maxrecords=5$/);
assert.equal(P.gdelt.needsQuery, true, "GDELT cannot browse");
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

// Internet Archive: Lucene characters are removed from the phrase; odd records are skipped or normalised
const iaUrl = new URL(P.internetArchive.request('dune: "frank" (herbert) -x', 7));
assert.equal(iaUrl.host, "archive.org");
assert.equal(iaUrl.searchParams.get("q"), "(dune frank herbert x) AND mediatype:texts");
assert.equal(iaUrl.searchParams.get("rows"), "7");
assert.equal(iaUrl.searchParams.get("output"), "json");
assert.deepEqual(iaUrl.searchParams.getAll("fl[]"), ["identifier", "title", "creator", "year"]);
items = P.internetArchive.parse({ response: { docs: [
  { identifier: "frankenstein00shel", title: "Frankenstein", creator: ["Shelley, Mary", "Other"], year: "1818-01-01T00:00:00Z" },
  { identifier: "solo", title: ["Array title"], creator: "One Author", year: 1999 },
  { identifier: "no spaces allowed", title: "bad id" },
  { identifier: "notitle" },
] } });
assert.deepEqual(items.map((i) => [i.title, i.creator, i.publishedAt, i.url]), [
  ["Frankenstein", "Shelley, Mary; Other", "1818", "https://archive.org/details/frankenstein00shel"],
  ["Array title", "One Author", "1999", "https://archive.org/details/solo"],
]);
assert.equal(items[0].imageUrl, "https://archive.org/services/img/frankenstein00shel");
assert.deepEqual(P.internetArchive.parse({}), []);

items = P.wikiversity.parse({ query: { search: [{ pageid: 5, title: "Algebra", snippet: 'learn <span class="searchmatch">algebra</span> &amp; more', timestamp: "2026-01-01T00:00:00Z" }, { title: "no id" }] } });
assert.deepEqual([items.length, items[0].kind, items[0].summary, items[0].url], [1, "lesson", "learn algebra & more", "https://en.wikiversity.org/?curid=5"]);
assert.equal(P.wikipedia.parse({ query: { search: [{ pageid: 1, title: "T", snippet: "" }] } })[0].kind, "article");

items = P.openAlex.parse({ results: [{ id: "https://openalex.org/W1", display_name: "A study", publication_year: 2024, doi: "https://doi.org/10.1/x", authorships: [1, 2, 3, 4, 5].map((n) => ({ author: { display_name: "Author " + n } })), primary_location: { source: { display_name: "Journal X" } }, open_access: { is_oa: true }, cited_by_count: 7 }, { id: "https://openalex.org/W2", display_name: "No link", doi: "ftp://x" }] });
assert.equal(items[0].url, "https://doi.org/10.1/x");
assert.equal(items[0].creator, "Author 1, Author 2, Author 3, Author 4 et al.");
assert.equal(items[0].access, "Open access");
assert.equal(items[1].url, "https://openalex.org/W2", "falls back to the record address");

// publisher feeds: RSS 2.0 with CDATA and escaped markup, Atom, RDF, and everything a hostile or broken feed might contain
const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Wire</title><link>https://wire.example</link>
<item><title><![CDATA[Flood relief arrives in Kampala]]></title><link>https://wire.example/a?utm=rss</link><pubDate>Tue, 17 Nov 2026 09:30:00 GMT</pubDate>
<description><![CDATA[<p>Trucks reached the <b>eastern</b> districts &amp; camps.</p>]]></description>
<media:thumbnail url="https://img.example/a.jpg" width="240" height="135"/></item>
<item><title>Tom &amp;amp; Jerry &lt;3 news</title><link>  https://wire.example/b  </link><dc:date>2026-11-17T08:00:00+03:00</dc:date>
<description>&lt;p&gt;Escaped &lt;em&gt;markup&lt;/em&gt; here&lt;/p&gt;</description><enclosure url="http://insecure.example/b.jpg" type="image/jpeg" length="1"/></item>
<item><title>Guid link only</title><guid isPermaLink="true">https://wire.example/c</guid><enclosure url="https://img.example/c.jpg" type="image/jpeg"/></item>
<item><title>Script link</title><link>javascript:alert(1)</link></item>
<item><link>https://wire.example/no-title</link></item>
<item><title>Relative link</title><link>/just/a/path</link></item>
</channel></rss>`;
items = P.parseFeed(RSS, "Wire");
assert.deepEqual(items.map((i) => i.title), ["Flood relief arrives in Kampala", "Tom & Jerry <3 news", "Guid link only"], "double-escaped titles read as text");
assert.equal(items[0].url, "https://wire.example/a?utm=rss");
assert.equal(items[0].publishedAt, "2026-11-17T09:30:00.000Z");
assert.equal(items[0].summary, "Trucks reached the eastern districts & camps.");
assert.equal(items[0].imageUrl, "https://img.example/a.jpg");
assert.equal(items[0].source, "Wire");
assert.equal(items[0].kind, "news");
assert.equal(items[1].url, "https://wire.example/b", "whitespace around a link is trimmed");
assert.equal(items[1].publishedAt, "2026-11-17T05:00:00.000Z", "dc:date with an offset is normalised to UTC");
assert.equal(items[1].summary, "Escaped markup here", "escaped markup is decoded and then removed");
assert.equal(items[1].imageUrl, undefined, "an insecure enclosure image is dropped");
assert.equal(items[2].url, "https://wire.example/c", "falls back to the guid");
assert.equal(items[2].imageUrl, "https://img.example/c.jpg");
assert.ok(items.every((i) => /^https?:\/\//.test(i.url)), "no script, relative or empty links get through");

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom wire</title><link rel="self" href="https://atom.example/feed"/>
<entry><title type="html">Atom &amp; story</title><link rel="self" href="https://atom.example/self"/><link rel="alternate" href="https://atom.example/story?a=1&amp;b=2"/>
<published>2026-11-16T10:00:00Z</published><updated>2026-11-17T10:00:00Z</updated><summary>Short summary</summary></entry>
<entry><title>Only a self link</title><link rel="self" href="https://atom.example/only-self"/></entry></feed>`;
items = P.parseFeed(ATOM, "Atom wire");
assert.deepEqual(items.map((i) => [i.title, i.url, i.publishedAt, i.summary]), [["Atom & story", "https://atom.example/story?a=1&b=2", "2026-11-16T10:00:00.000Z", "Short summary"]]);

const RDF = `<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/"><channel><title>RDF</title><items><rdf:Seq><rdf:li rdf:resource="https://rdf.example/1"/></rdf:Seq></items></channel>
<item rdf:about="https://rdf.example/1"><title>RDF headline</title><link>https://rdf.example/1</link><description>RDF body</description></item></rdf:RDF>`;
items = P.parseFeed(RDF, "RDF wire");
assert.deepEqual(items.map((i) => [i.title, i.url]), [["RDF headline", "https://rdf.example/1"]], "RDF items are read; the channel's <items> list is not an item");

assert.deepEqual(P.parseFeed(undefined, "x"), []);
assert.deepEqual(P.parseFeed("<html><body>Access denied</body></html>", "x"), []);
assert.equal(P.parseFeed(`<rss><channel>${Array.from({ length: 100 }, (_, i) => `<item><title>t${i}</title><link>https://x.example/${i}</link></item>`).join("")}</channel></rss>`, "x").length, 40, "a feed is read up to 40 items");
assert.ok(P.parseFeed(`<rss><channel><item><title>t</title><link>https://x.example/1</link><description>${"word ".repeat(200)}</description></item></channel></rss>`, "x")[0].summary.length <= 240, "summaries stay short");

// a broken or hostile feed must not be able to stall the function (regex backtracking is synchronous and cannot be timed out)
const started = performance.now();
for (const nasty of ["<item>".repeat(150000), "<item ".repeat(150000), "<rss><item><title>".repeat(50000), "<item><title>x</title><link>https://a.example/</link>" + "<title ".repeat(100000) + "</item>", "<item><title>x</title>" + "<link ".repeat(100000) + "</item>", "<item><title>x</title>" + "<enclosure ".repeat(100000) + "</item>"]) P.parseFeed(nasty, "x");
assert.ok(performance.now() - started < 3000, `pathological feeds parse in linear time (took ${Math.round(performance.now() - started)} ms)`);

// matching words typed against a feed: every word must start a word in the title or summary
const sample = [{ id: "1", kind: "news", title: "Iran talks resume", source: "s", url: "https://a.example/1" }, { id: "2", kind: "news", title: "Floods in Kampala", summary: "Heavy rain", source: "s", url: "https://a.example/2" }, { id: "3", kind: "news", title: "Café culture", source: "s", url: "https://a.example/3" }];
assert.deepEqual(P.matchesWords(sample, "iran").map((i) => i.id), ["1"]);
assert.deepEqual(P.matchesWords(sample, "ran").map((i) => i.id), [], "a word must start with what was typed, so ran does not match Iran");
assert.deepEqual(P.matchesWords(sample, "flood rain").map((i) => i.id), ["2"], "words from the title and summary combine");
assert.deepEqual(P.matchesWords(sample, "flood talks").map((i) => i.id), [], "every word has to match");
assert.deepEqual(P.matchesWords(sample, "CAFÉ").map((i) => i.id), ["3"], "case and accents are handled");
assert.equal(P.matchesWords(sample, "").length, 3, "an empty query keeps everything");

// systems: exactly the five outward-looking ones, each with real providers
assert.deepEqual(Object.keys(P.SYSTEM_PROVIDERS).sort(), ["books-reading", "fresh-music", "fresh-news", "learn", "research-knowledge"]);
assert.ok(P.isGlobalSystem("fresh-news") && !P.isGlobalSystem("fresh-posts") && !P.isGlobalSystem("constructor"));
assert.ok(P.isBrowsable("fresh-news") && !P.isBrowsable("fresh-music") && !P.isBrowsable("constructor"));
const allProviders = Object.values(P.SYSTEM_PROVIDERS).flat();
assert.equal(new Set(allProviders.map((p) => p.id)).size, allProviders.length, "provider ids are unique");
for (const p of allProviders) assert.match(p.request("test query", 5), /^https:\/\//, `${p.id} is called over https`);
assert.ok(P.NEWS_FEEDS.length >= 6 && P.NEWS_FEEDS.every((f) => f.format === "xml" && f.group === "Publisher feeds" && f.filtersLocally));

// discover(): fan out, interleave, de-duplicate, survive failures, report honestly
assert.equal(D.cleanQuery("  a\u0000\n  b  "), "a b");
assert.equal(D.cleanQuery("x".repeat(500)).length, D.MAX_QUERY);
assert.equal(D.cleanQuery(42), "");
const reply = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
const replies = {
  "openlibrary.org": { docs: [{ key: "/works/1", title: "Book one" }, { key: "/works/2", title: "Book two" }] },
  "archive.org": { response: { docs: [{ identifier: "ia-one", title: "Archive one" }] } },
};
const seenUrls = [];
const fetcher = async (url) => { seenUrls.push(url); return reply(replies[new URL(url).host]); };
let r = await D.discover("books-reading", "  dune ", fetcher);
assert.equal(r.query, "dune");
assert.deepEqual(r.items.map((i) => i.title), ["Book one", "Archive one", "Book two"], "providers interleave");
assert.deepEqual(r.providers.map((p) => [p.id, p.ok, p.count]), [["openlibrary", true, 2], ["internetarchive", true, 1]]);

const down = async (url) => { if (url.includes("archive.org")) throw new Error("boom"); return fetcher(url); };
r = await D.discover("books-reading", "dune", down);
assert.equal(r.items.length, 2);
assert.deepEqual(r.providers[1], { id: "internetarchive", label: "Internet Archive", ok: false, count: 0, error: "Internet Archive could not be reached." });

const forbidden = async (url) => (url.includes("archive.org") ? { ok: false, status: 403, json: async () => ({}), text: async () => "" } : fetcher(url));
r = await D.discover("books-reading", "dune", forbidden);
assert.equal(r.providers[1].error, "Internet Archive answered HTTP 403.", "a refusal is reported, not hidden as 'no results'");

const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("a"), { name: "AbortError" }))));
r = await D.discover("fresh-music", "song", hang, { timeoutMs: 20 });
assert.equal(r.providers[0].error, "Apple music catalog took too long.");

const notJson = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("x"); }, text: async () => "<html>" });
r = await D.discover("fresh-music", "song", notJson);
assert.equal(r.providers[0].ok, false);

await assert.rejects(() => D.discover("learn", "a", fetcher), /at least 2 characters/);
await assert.rejects(() => D.discover("fresh-music", "", fetcher), /at least 2 characters/, "only news can be browsed without typing");
await assert.rejects(() => D.discover("fresh-news", "a", fetcher), /at least 2 characters/, "one letter is not a search, even for news");
await assert.rejects(() => D.discover("fresh-posts", "abc", fetcher), /Unknown system/);
await assert.rejects(() => D.discover("constructor", "abc", fetcher), /Unknown system/);

// news: publisher feeds plus GDELT
const feedUrl = (id) => P.NEWS_FEEDS.find((f) => f.id === id).request("", 10);
const rssItem = (title, link, date) => `<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate><description>${title} in detail</description></item>`;
const rssDoc = (...entries) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${entries.join("")}</channel></rss>`;
const atomDoc = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Flood fund opens</title><link rel="alternate" href="https://dw.example/fund"/><updated>2026-11-17T10:00:00Z</updated></entry></feed>`;
const feedXml = {
  [feedUrl("bbc-world")]: rssDoc(rssItem("Flood relief arrives in Kampala", "https://bbc.example/1", "Tue, 17 Nov 2026 09:30:00 GMT"), rssItem("Markets calm", "https://shared.example/markets", "Tue, 17 Nov 2026 07:00:00 GMT")),
  [feedUrl("aljazeera")]: rssDoc(rssItem("Flood warning for river basin", "https://aj.example/1", "Tue, 17 Nov 2026 11:00:00 GMT"), rssItem("Markets calm", "https://shared.example/markets", "Tue, 17 Nov 2026 07:00:00 GMT")),
  [feedUrl("dw")]: atomDoc,
};
const gdeltBody = { articles: [{ url: "https://old.example/flood", title: "Flood waters recede", seendate: "20261117T120000Z", domain: "old.example" }] };
const newsCalls = [];
const newsFetcher = (overrides = {}) => async (url) => {
  newsCalls.push(url);
  if (url in overrides) return overrides[url];
  if (url.includes("gdeltproject")) return reply(url.includes("query=flood") ? gdeltBody : { articles: [] });
  if (url in feedXml) return reply(feedXml[url]);
  return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
};

// browsing: no query, newest first, duplicates collapse, GDELT is not asked
newsCalls.length = 0;
r = await D.discover("fresh-news", "", newsFetcher());
assert.equal(r.query, "");
assert.deepEqual(r.items.map((i) => i.title), ["Flood warning for river basin", "Flood fund opens", "Flood relief arrives in Kampala", "Markets calm"], "newest first, the shared story appears once");
assert.ok(!newsCalls.some((u) => u.includes("gdeltproject")), "GDELT needs words, so it is not called while browsing");
assert.equal(newsCalls.length, P.NEWS_FEEDS.length);
assert.equal(r.providers.length, 1);
assert.deepEqual([r.providers[0].id, r.providers[0].label, r.providers[0].ok, r.providers[0].count], ["publisher-feeds", "Publisher feeds", true, 5]);
assert.match(r.providers[0].note, /^5 of 8 publisher feeds did not answer: BBC News Africa, France 24, NPR, The Guardian, allAfrica\.$/, "missing feeds are named, not hidden");
assert.equal(r.providers[0].error, undefined);

// searching: feeds are filtered by the words typed and GDELT adds its wider index; newest first across both
r = await D.discover("fresh-news", "flood", newsFetcher());
assert.deepEqual(r.items.map((i) => i.title), ["Flood waters recede", "Flood warning for river basin", "Flood fund opens", "Flood relief arrives in Kampala"]);
assert.deepEqual(r.providers.map((p) => [p.id, p.ok, p.count]), [["publisher-feeds", true, 3], ["gdelt", true, 1]]);
r = await D.discover("fresh-news", "markets", newsFetcher());
assert.deepEqual(r.items.map((i) => i.url), ["https://shared.example/markets"], "a feed item that matches is kept once");
r = await D.discover("fresh-news", "zzzzqqqq", newsFetcher());
assert.deepEqual(r.items, []);
assert.ok(r.providers.every((p) => p.ok), "no match is a normal empty result, not a failure");

// every feed down: one clear line, never "no news"
const allFeedsDown = {}; for (const f of P.NEWS_FEEDS) allFeedsDown[f.request("", 10)] = { ok: false, status: 503, json: async () => ({}), text: async () => "" };
r = await D.discover("fresh-news", "", newsFetcher(allFeedsDown));
assert.deepEqual(r.items, []);
assert.deepEqual(r.providers, [{ id: "publisher-feeds", label: "Publisher feeds", ok: false, count: 0, error: "None of the 8 publisher feeds answered." }]);
r = await D.discover("fresh-news", "flood", newsFetcher(allFeedsDown));
assert.deepEqual(r.items.map((i) => i.title), ["Flood waters recede"], "GDELT still answers when the feeds are down");
assert.equal(r.providers[0].ok, false);
assert.equal(r.providers[1].ok, true);

// GDELT rate limit is reported next to the feed results
const limited = { [P.gdelt.request("flood", 10)]: { ok: false, status: 429, json: async () => ({}), text: async () => "slow down" } };
r = await D.discover("fresh-news", "flood", newsFetcher(limited));
assert.equal(r.providers[1].error, "GDELT news index answered HTTP 429.");
assert.equal(r.items.length, 3, "feed results are still shown");

// a 200 reply that is not a feed (a bot-check page) is a failure, not an empty feed
const blocked = {}; for (const f of P.NEWS_FEEDS) blocked[f.request("", 10)] = reply("<html><body>Please verify you are human</body></html>");
r = await D.discover("fresh-news", "", newsFetcher(blocked));
assert.deepEqual(r.providers, [{ id: "publisher-feeds", label: "Publisher feeds", ok: false, count: 0, error: "None of the 8 publisher feeds answered." }]);

// the list is capped and every feed is asked for xml
const many = {}; for (const f of P.NEWS_FEEDS) many[f.request("", 10)] = rssDoc(...Array.from({ length: 12 }, (_, i) => rssItem(`${f.id} story ${i}`, `https://${f.id}.example/${i}`, new Date(Date.UTC(2026, 10, 17, 0, i)).toUTCString())));
let accept = "";
r = await D.discover("fresh-news", "", async (url, init) => { if (url in many) { accept = init.headers.accept; return reply(many[url]); } return newsFetcher()(url); }, { limit: 10 });
assert.equal(r.items.length, 30, "news is capped at 30");
assert.match(accept, /rss\+xml/);
assert.ok(r.items.every((it, i, all) => i === 0 || Date.parse(all[i - 1].publishedAt) >= Date.parse(it.publishedAt)), "sorted newest first");
assert.ok(seenUrls.every((u) => u.startsWith("https://")), "providers are only called over https");

// wiring: the endpoint lives inside an existing function (Vercel Hobby allows 12) and is routed before the catch-all
const fs = await import("node:fs");
assert.equal(fs.existsSync("api/discover.ts"), false, "a new api file would exceed the Hobby function limit");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const at = vercel.routes.findIndex((route) => route.src === "/api/discover");
assert.ok(at >= 0 && at < vercel.routes.findIndex((route) => route.src === "/api/(.*)"), "route comes before the catch-all");
assert.equal(vercel.routes[at].dest, "/api/research/search?__fresh_discover=1");
const searchApi = fs.readFileSync("api/research/search.ts", "utf8");
assert.match(searchApi, /__fresh_discover/);
assert.match(searchApi, /isGlobalSystem\(system\)/);
console.log(`Global discovery contract passed (${allProviders.length} providers, 5 systems, headlines, failures reported, no invented results).`);
