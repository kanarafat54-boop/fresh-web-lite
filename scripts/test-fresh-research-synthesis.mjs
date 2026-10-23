import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = await mkdtemp(join(tmpdir(), "fresh-research-synthesis-"));
try {
  const bundle = await build({
    entryPoints: ["src/server/research/orchestrator.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "bundle",
  });
  const modulePath = join(tempDir, "research-orchestrator.mjs");
  await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
  const { synthesizeResearch } = await import(pathToFileURL(modulePath).href);

  const result = synthesizeResearch([
    {
      answer: "A sample answer that should not be mistaken for a verified fact.",
      sources: [
        { title: "First result", url: "https://www.example.com/article/?utm_source=feed#top", snippet: "A specific source excerpt.", provider: "Tavily" },
        { title: "Duplicate tracking URL", url: "https://example.com/article", snippet: "A longer specific source excerpt that preserves useful context.", provider: "Tavily" },
        { title: "Subdomain duplicate", url: "https://news.example.com/another", snippet: "Same publisher domain.", provider: "Tavily" },
        { title: "Second domain", url: "https://second.test/story", snippet: "Independent domain excerpt.", provider: "Tavily" },
      ],
    },
    {
      answer: "A different answer summary; difference alone is not a contradiction.",
      sources: [
        { title: "Third domain", url: "https://third.test/story", snippet: "Third independent excerpt.", provider: "Tavily" },
        { title: "Fourth domain", url: "https://fourth.test/story", snippet: "Fourth independent excerpt.", provider: "Tavily" },
      ],
    },
  ]);

  assert.equal(result.sources.length, 5, "canonical URLs must be deduplicated while distinct paths remain");
  assert.equal(result.sources[0].url, "https://example.com/article", "tracking params, fragment, www and trailing slash must be normalized");
  assert.match(result.sources[0].snippet, /longer specific source excerpt/, "duplicate merge should preserve the richer excerpt");
  assert.equal(result.verification.uniqueDomains, 4, "subdomains must not inflate publisher diversity");
  assert.equal(result.verification.independentPasses, 4, "independence must count distinct registrable domains, not query passes");
  assert.equal(result.verification.confidence, "medium", "medium confidence requires several sources and distinct domains");
  assert.equal(result.verification.contradictionsDetected, false, "different generated summaries alone must not trigger contradiction claims");
  assert.equal(result.claims.length, 5, "claims must be generated from deduplicated source records");
  for (const claim of result.claims) {
    assert.equal(claim.sourceUrls.length, 1, "each evidence claim must cite exactly its source");
    assert.ok(result.sources.some((source) => source.url === claim.sourceUrls[0]), "claim citation must resolve to a returned source");
    assert.equal(claim.status, "unverified", "search excerpts must not be presented as entailment-verified claims");
  }

  const weak = synthesizeResearch([{
    answer: "One-source summary.",
    sources: [{ title: "One source", url: "https://only.test/article", provider: "Tavily" }],
  }]);
  assert.equal(weak.verification.confidence, "low", "one source without an excerpt must stay low confidence");
  assert.equal(weak.claims[0].confidence, 0.2, "title-only claims should carry lower confidence than excerpts");
  assert.equal(weak.claims[0].status, "unverified");
  console.log("Fresh research synthesis tests: PASS (canonical dedupe, source diversity, exact provenance, confidence calibration)");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
