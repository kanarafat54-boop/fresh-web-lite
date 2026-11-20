import assert from "node:assert/strict";
import { canonicalizeSourceUrl, canonicalSourceId, uniqueByCanonicalUrl } from "../src/core/research/canonicalSource.ts";
import { synthesizeResearch } from "../src/server/research/orchestrator.ts";

assert.equal(
  canonicalizeSourceUrl("HTTPS://WWW.Example.com:443/story/?utm_source=mail&b=2&a=1#section"),
  "https://example.com/story?a=1&b=2",
  "host casing, www, default port, tracking parameters, fragments and query order normalize",
);
assert.equal(
  canonicalizeSourceUrl("https://example.com/article?id=42&utm_campaign=spring"),
  "https://example.com/article?id=42",
  "meaningful query parameters are retained",
);
assert.equal(
  canonicalizeSourceUrl("https://example.com/article?id=42"),
  canonicalizeSourceUrl("https://example.com/article/?id=42#top"),
  "safe URL variants share an identity",
);
assert.notEqual(
  canonicalizeSourceUrl("https://example.com/article?id=42"),
  canonicalizeSourceUrl("https://example.com/article?id=43"),
  "different meaningful query values remain distinct",
);
assert.equal(canonicalizeSourceUrl("javascript:alert(1)"), null);
assert.equal(canonicalizeSourceUrl("file:///etc/passwd"), null);
assert.equal(canonicalizeSourceUrl("https://user:secret@example.com/private"), null);
assert.equal(canonicalizeSourceUrl("not a url"), null);

const first = "https://www.example.com/story?utm_medium=social&id=7";
const second = "https://example.com/story/?id=7#comments";
assert.equal(canonicalSourceId(first), canonicalSourceId(second), "stable IDs use canonical identity");
assert.match(canonicalSourceId(first) ?? "", /^fresh-source-[a-f0-9]{32}$/);
assert.equal(canonicalSourceId("javascript:alert(1)"), null);

const sources = [
  { title: "First observed", url: first, provider: "provider-a" },
  { title: "Tracking duplicate", url: second, provider: "provider-b" },
  { title: "Different article", url: "https://example.com/story?id=8", provider: "provider-a" },
  { title: "Unsafe source", url: "javascript:alert(1)", provider: "provider-a" },
  { title: "Unsafe source duplicate", url: "javascript:alert(1)", provider: "provider-b" },
];
const unique = uniqueByCanonicalUrl(sources);
assert.deepEqual(unique.map((item) => item.title), ["First observed", "Different article", "Unsafe source"]);

const synthesis = synthesizeResearch([
  { answer: "Research answer", sources: sources.slice(0, 3) },
]);
assert.equal(synthesis.sources.length, 2, "research synthesis deduplicates canonical URLs before source counts");
assert.equal(synthesis.verification.uniqueDomains, 1, "domain diversity is calculated after canonical deduplication");

console.log("Fresh Research canonical-source identity checks passed.");
