import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalFetch = globalThis.fetch;
const originalKey = process.env.TAVILY_API_KEY;
const tempDir = await mkdtemp(join(tmpdir(), "fresh-ai-research-adapter-"));

try {
  process.env.TAVILY_API_KEY = "test-only-not-a-real-key";
  const bundle = await build({
    entryPoints: ["api/ai/stream.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "bundle",
  });
  const modulePath = join(tempDir, "ai-stream.mjs");
  await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
  const { researchFreshAIWebEvidence } = await import(pathToFileURL(modulePath).href);

  // 1: Valid evidence is normalized, bounded, and restricted to HTTPS source URLs.
  let capturedInit;
  globalThis.fetch = async (_url, init) => {
    capturedInit = init;
    return new Response(JSON.stringify({
      results: [
        { title: " Valid source ", url: "https://example.test/research", content: "Evidence text", published_date: "2026-10-20" },
        { title: "Unsafe source", url: "http://example.test/insecure", content: "Must be rejected" },
        { title: "Credential URL", url: "https://user:pass@example.test/private", content: "Must be rejected" },
        { title: "", url: "https://example.test/empty-title", content: "Must be rejected" },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const evidence = await researchFreshAIWebEvidence("controlled integration test");
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].source, "https://example.test/research");
  assert.match(evidence[0].claim, /Valid source: Evidence text/);
  assert.ok(capturedInit.signal instanceof AbortSignal);
  assert.equal(capturedInit.redirect, "error");
  assert.equal(capturedInit.cache, "no-store");

  // 2: Missing provider configuration is an explicit no-provider state, not a fabricated result.
  delete process.env.TAVILY_API_KEY;
  const beforeMissingKey = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Should not call provider without a key"); };
  assert.deepEqual(await researchFreshAIWebEvidence("no provider configured"), []);
  globalThis.fetch = beforeMissingKey;
  process.env.TAVILY_API_KEY = "test-only-not-a-real-key";

  // 3: Provider errors, unsupported response types, malformed JSON and oversized bodies fail explicitly.
  globalThis.fetch = async () => new Response("provider unavailable", { status: 503 });
  await assert.rejects(() => researchFreshAIWebEvidence("provider failure"), /HTTP 503/);

  globalThis.fetch = async () => new Response("not json", { status: 200, headers: { "content-type": "text/plain" } });
  await assert.rejects(() => researchFreshAIWebEvidence("unsupported content"), /unsupported response type/);

  globalThis.fetch = async () => new Response("{bad json", { status: 200, headers: { "content-type": "application/json" } });
  await assert.rejects(() => researchFreshAIWebEvidence("malformed payload"), /invalid JSON/);

  globalThis.fetch = async () => new Response("x".repeat(1_000_001), { status: 200, headers: { "content-type": "application/json" } });
  await assert.rejects(() => researchFreshAIWebEvidence("oversized payload"), /exceeded the allowed size/);

  console.log("Fresh AI web research adapter integration tests: PASS (5 groups)");
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.TAVILY_API_KEY; else process.env.TAVILY_API_KEY = originalKey;
  await rm(tempDir, { recursive: true, force: true });
}
