import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.TAVILY_API_KEY;
const originalDryRun = process.env.PERSISTENCE_DRY_RUN;
const tempDir = await mkdtemp(join(tmpdir(), "fresh-research-route-"));
try {
  process.env.TAVILY_API_KEY = "test-only-not-a-real-key";
  process.env.PERSISTENCE_DRY_RUN = "true";

  const bundle = await build({
    entryPoints: ["api/research/search.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "bundle",
  });
  const modulePath = join(tempDir, "research-route.mjs");
  await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
  const { POST } = await import(pathToFileURL(modulePath).href);

  let providerCalls = 0;
  globalThis.fetch = async () => {
    providerCalls += 1;
    return new Response(JSON.stringify({
      answer: "Example research answer from controlled test data.",
      results: [{
        title: "Example source",
        url: "https://example.test/research",
        content: "Controlled test evidence for a research persistence dry run.",
        published_date: "2026-10-15",
      }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  // 1: Exercise the real HTTP handler through research synthesis and the dry-run persistence bridge.
  const response = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "controlled TRUEMODE integration test", mode: "quick", maxSources: 2 }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.answer, "Example research answer from controlled test data.");
  assert.equal(body.intelligencePersisted, false, "dry-run must never be reported as durable persistence");
  assert.equal(body.retrievalCapabilities.categories.web.status, "available");
  assert.equal(body.retrievalCapabilities.categories.news.status, "available");
  assert.equal(body.retrievalCapabilities.categories.images.status, "not_configured");
  assert.equal(body.retrievalCapabilities.categories.videos.status, "not_configured");
  assert.equal(body.retrievalCapabilities.categories.academic.status, "query_biased", "academic must not imply a dedicated scholarly index");
  assert.equal(body.persistence?.dryRun, true);
  assert.equal(body.persistence?.sources, 1);
  assert.ok(body.claims.every((claim) => claim.sourceUrls.every((url) => body.sources.some((source) => source.url === url))), "claim citations must resolve to returned sources");
  assert.equal(body.warnings.some((warning) => warning.includes("memory layer could not persist")), false);
  assert.equal(providerCalls, 1);

  // 2: Invalid input is rejected before contacting the provider.
  const callsBeforeInvalid = providerCalls;
  const invalid = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "   " }),
  }));
  assert.equal(invalid.status, 400);
  assert.equal(providerCalls, callsBeforeInvalid);

  // 3: If every research pass fails, the handler returns a failure rather than a fabricated answer.
  globalThis.fetch = async () => new Response("provider unavailable", { status: 503 });
  const failed = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "provider failure case", mode: "quick" }),
  }));
  assert.equal(failed.status, 504);
  const failedBody = await failed.json();
  assert.match(failedBody.error, /All web research passes failed/);
  assert.equal(failedBody.runId.length > 0, true);

  console.log("Fresh research API dry-run integration tests: PASS (3 cases; no database writes)");
} finally {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.TAVILY_API_KEY; else process.env.TAVILY_API_KEY = originalApiKey;
  if (originalDryRun === undefined) delete process.env.PERSISTENCE_DRY_RUN; else process.env.PERSISTENCE_DRY_RUN = originalDryRun;
  await rm(tempDir, { recursive: true, force: true });
}
