import assert from "node:assert/strict";
import { canonicalizeSourceUrl, canonicalSourceId, uniqueByCanonicalUrl } from "../src/core/research/canonicalSource.ts";
import { synthesizeResearch } from "../src/server/research/orchestrator.ts";

assert.equal(
  canonicalizeSourceUrl("HTTPS://WWW.Example.com:443/story/?utm_source=mail&b=2&a=1#section"),
  "https://www.example.com/story/?b=2&a=1",
  "host casing/default port normalize; tracking and fragments are removed; www, path and query order are preserved",
);
assert.equal(
  canonicalizeSourceUrl("https://example.com/article?id=42&utm_campaign=spring"),
  "https://example.com/article?id=42",
  "meaningful query parameters are retained",
);
assert.equal(
  canonicalizeSourceUrl("https://example.com/article?id=42&utm_source=mail"),
  canonicalizeSourceUrl("https://example.com/article?id=42#top"),
  "tracking parameters and fragments do not change identity",
);
assert.notEqual(
  canonicalizeSourceUrl("https://example.com/article?id=42"),
  canonicalizeSourceUrl("https://example.com/article?id=43"),
  "different meaningful query values remain distinct",
);
assert.notEqual(
  canonicalizeSourceUrl("https://example.com/article?id=42"),
  canonicalizeSourceUrl("https://example.com/article/?id=42"),
  "trailing slash differences are preserved because servers may treat paths differently",
);
assert.notEqual(
  canonicalizeSourceUrl("https://example.com/a?x=1&y=2"),
  canonicalizeSourceUrl("https://example.com/a?y=2&x=1"),
  "query parameter order is preserved to avoid changing signed or order-sensitive URLs",
);
assert.equal(canonicalizeSourceUrl("javascript:alert(1)"), null);
assert.equal(canonicalizeSourceUrl("file:///etc/passwd"), null);
assert.equal(canonicalizeSourceUrl("https://user:secret@example.com/private"), null);
assert.equal(canonicalizeSourceUrl("not a url"), null);
assert.equal(canonicalizeSourceUrl({ url: "https://example.com" }), null, "malformed provider URL values are rejected safely");

const first = "https://example.com/story?id=7&utm_medium=social";
const second = "https://example.com/story?id=7#comments";
assert.equal(canonicalSourceId(first), canonicalSourceId(second), "stable IDs use canonical identity");
assert.match(canonicalSourceId(first) ?? "", /^fresh-source-[a-f0-9]{32}$/);
assert.equal(canonicalSourceId("javascript:alert(1)"), null);

const sources = [
  { title: "First observed", url: first, provider: "provider-a" },
  { title: "Tracking duplicate", url: second, provider: "provider-b" },
  { title: "Different article", url: "https://example.com/story?id=8", provider: "provider-a" },
  { title: "Unsafe source", url: "javascript:alert(1)", provider: "provider-a" },
  { title: "Unsafe source duplicate", url: "javascript:alert(1)", provider: "provider-b" },
  { title: "Malformed source", url: 42, provider: "provider-c" },
];
const unique = uniqueByCanonicalUrl(sources);
assert.deepEqual(unique.map((item) => item.title), ["First observed", "Different article", "Unsafe source"]);

const synthesis = synthesizeResearch([
  { answer: "Research answer one", sources: [sources[0]] },
  { answer: "Research answer two", sources: [sources[1], sources[2]] },
]);
assert.equal(synthesis.sources.length, 2, "research synthesis deduplicates canonical URLs before source counts");
assert.equal(synthesis.verification.uniqueDomains, 1, "domain diversity is calculated after canonical deduplication");
assert.equal(synthesis.verification.independentPasses, 1, "duplicate provider/domain records do not inflate the independent-source count");
assert.deepEqual(synthesis.claims[1].sourceUrls, [first, "https://example.com/story?id=8"], "claim provenance is remapped to the retained canonical source URL while preserving other evidence");

console.log("Fresh Research canonical-source identity checks passed.");
