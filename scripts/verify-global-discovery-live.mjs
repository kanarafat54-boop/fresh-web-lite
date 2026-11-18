// Calls the real public catalogs through the real discover() code. Needs network, so it runs in CI, not in the sandbox.
// A source that is down is printed loudly and, where Fresh depends on it, fails the run. It is never counted as "no results".
import assert from "node:assert/strict";
const G = await import("../src/core/discovery/globalDiscovery.ts");
const fetcher = (url, init) => fetch(url, init);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const problems = [];

console.log("Publisher feeds, one at a time:");
for (const feed of G.NEWS_FEEDS) {
  const started = Date.now();
  try {
    const res = await fetch(feed.request("", 10), { headers: { accept: G.FEED_ACCEPT, "user-agent": G.USER_AGENT }, signal: AbortSignal.timeout(15000) });
    const items = res.ok ? feed.parse(await res.text()) : [];
    console.log(`  ${feed.label.padEnd(18)} HTTP ${res.status}  ${String(items.length).padStart(2)} items  ${Date.now() - started} ms${items[0] ? `  e.g. ${items[0].title.slice(0, 70)}` : ""}`);
  } catch (error) { console.log(`  ${feed.label.padEnd(18)} FAILED ${error instanceof Error ? error.message : error}`); }
}

function show(system, query, result) {
  console.log(`\n${system} for ${query ? `"${query}"` : "latest headlines"}: ${result.items.length} items`);
  for (const p of result.providers) console.log(`  ${p.ok ? "ok    " : "FAILED"} ${p.label}: ${p.ok ? `${p.count} results` : p.error}${p.note ? `  (${p.note})` : ""}`);
  for (const item of result.items.slice(0, 3)) console.log(`    - ${item.title.slice(0, 80)}  [${item.source}${item.publishedAt ? `, ${item.publishedAt.slice(0, 16)}` : ""}]  ${item.url}`);
  for (const item of result.items) assert.ok(/^https?:\/\//.test(item.url) && item.title, `${system}: malformed item ${JSON.stringify(item)}`);
}

// News: headlines with nothing typed must come from several publishers. GDELT is only a fallback and may be rate limited or slow:
// it is printed here, but it never fails the run.
const headlines = await G.discover("fresh-news", "", fetcher, { limit: 10, timeoutMs: 15000 });
show("fresh-news", "", headlines);
const publishers = new Set(headlines.items.map((item) => item.source));
if (headlines.items.length < 10 || publishers.size < 3) problems.push(`news headlines: ${headlines.items.length} items from ${publishers.size} publishers (need 10 from 3)`);
// A topic the feeds cover well: GDELT should be spared.
const election = await G.discover("fresh-news", "election", fetcher, { limit: 10, timeoutMs: 15000 });
show("fresh-news", "election", election);
if (election.items.length === 0) problems.push("news search for 'election' returned nothing");
// A narrow topic: the feeds find little, so GDELT is asked. Whatever it does is reported; the feed stories must still show.
await sleep(5500); // GDELT allows one request every 5 seconds
const narrow = await G.discover("fresh-news", "uganda", fetcher, { limit: 10, timeoutMs: 15000 });
show("fresh-news", "uganda", narrow);
const asked = narrow.providers.some((p) => p.id === "gdelt");
console.log(`  GDELT was ${asked ? "asked" : "not asked (the feeds already had enough)"}.`);

// The other four systems depend on every one of their sources.
for (const [system, query] of [["fresh-music", "miles davis"], ["books-reading", "frankenstein"], ["learn", "algebra"], ["research-knowledge", "machine learning"]]) {
  await sleep(1000);
  const result = await G.discover(system, query, fetcher, { limit: 5, timeoutMs: 15000 });
  show(system, query, result);
  for (const p of result.providers) if (!p.ok || p.count === 0) problems.push(`${system} / ${p.label}: ${p.ok ? "no results for an ordinary search" : p.error}`);
}

assert.equal(problems.length, 0, `Global discovery live check found problems:\n - ${problems.join("\n - ")}`);
console.log("\nGlobal discovery live check passed.");
