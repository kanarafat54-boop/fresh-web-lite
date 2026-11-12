import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = await mkdtemp(join(tmpdir(), "fresh-research-provenance-"));
try {
  const bundle = await build({
    entryPoints: ["src/server/research/orchestrator.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "bundle",
  });
  const modulePath = join(tempDir, "orchestrator.mjs");
  await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
  const { synthesizeResearch, canonicalResearchUrl } = await import(pathToFileURL(modulePath).href);

  assert.equal(
    canonicalResearchUrl("http://www.example.test/story/?utm_source=mail#top"),
    "https://example.test/story",
    "canonicalization must drop tracking parameters, fragments, www, and default ports",
  );

  const result = synthesizeResearch([
    { answer: "Same page repeated in pass one.", sources: [
      { title: "Story", url: "https://www.example.test/story?utm_source=one", snippet: "A grounded snippet from the first source.", provider: "Tavily" },
      { title: "Other page", url: "https://example.test/other", snippet: "A second statement from the same publisher.", provider: "Tavily" },
    ] },
    { answer: "Same page repeated in pass two.", sources: [
      { title: "Story duplicate", url: "http://example.test/story#section", snippet: "Duplicate content should not inflate evidence.", provider: "Tavily" },
      { title: "Independent report", url: "https://independent.test/story", snippet: "A separate publisher offers a distinct report.", provider: "Tavily" },
    ] },
  ]);

  assert.equal(result.sources.length, 3, "tracking variants and fragments must count as one source");
  assert.equal(result.verification.uniqueSources, 3);
  assert.equal(result.verification.uniqueDomains, 2);
  assert.equal(result.verification.confidence, "medium", "confidence must use distinct sources/domains, not repeated passes");
  assert.ok(result.claims.every((claim) => claim.sourceUrls.length > 0), "source-level claims must carry source URLs");
  assert.ok(result.claims.every((claim) => claim.sourceUrls.every((url) => result.sources.some((source) => source.url === url))), "every claim citation must resolve to an exact normalized result");
  assert.ok(result.claims.every((claim) => claim.text !== result.answer), "the full synthesized pass answer must not be misrepresented as a source-level claim");

  const repeatedPublisher = synthesizeResearch([
    { answer: "A useful summary.", sources: [
      { title: "One", url: "https://same.test/a", snippet: "Repeated statement.", provider: "Tavily" },
      { title: "Two", url: "https://same.test/b", snippet: "Repeated statement.", provider: "Tavily" },
      { title: "Three", url: "https://same.test/c", snippet: "Repeated statement.", provider: "Tavily" },
    ] },
  ]);
  assert.equal(repeatedPublisher.claims[0].status, "unverified", "same-domain repetition must not count as independent corroboration");
  assert.equal(repeatedPublisher.claims[0].confidence, 0.35);

  console.log("Fresh Research provenance regression tests: PASS (canonical URLs, deduplication, exact citations, calibrated confidence)");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
