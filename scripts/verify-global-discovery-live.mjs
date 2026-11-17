// Calls the real public catalogs through the real discover() code. Needs network, so it runs in CI, not in the sandbox.
// A provider that is down fails the run loudly so we learn that a source changed; it is never counted as "no results".
import assert from "node:assert/strict";
const { discover } = await import("../src/core/discovery/globalDiscovery.ts");
const cases = [
  ["fresh-news", "election"], ["fresh-music", "miles davis"], ["books-reading", "frankenstein"],
  ["learn", "algebra"], ["research-knowledge", "machine learning"],
];
let bad = 0;
for (const [system, q] of cases) {
  const r = await discover(system, q, (url, init) => fetch(url, init), { limit: 5, timeoutMs: 15000 });
  for (const p of r.providers) {
    const line = `${system} / ${p.label}: ${p.ok ? p.count + " results" : "FAILED " + p.error}`;
    console.log(line);
    if (!p.ok || p.count === 0) bad++;
  }
  for (const it of r.items) assert.ok(/^https?:\/\//.test(it.url) && it.title, `${system}: malformed item ${JSON.stringify(it)}`);
  if (r.items[0]) console.log("   first:", r.items[0].title, "→", r.items[0].url);
  await new Promise((res) => setTimeout(res, 5500)); // GDELT allows one request every 5 seconds
}
assert.equal(bad, 0, `${bad} provider(s) failed or returned nothing for an ordinary search`);
console.log("Global discovery live check passed.");
