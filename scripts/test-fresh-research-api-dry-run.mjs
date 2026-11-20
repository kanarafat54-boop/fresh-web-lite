import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalFetch = globalThis.fetch;
const originalEnv = Object.fromEntries([
  "TAVILY_API_KEY", "PERSISTENCE_DRY_RUN", "SUPABASE_URL",
  "SUPABASE_SECRET_KEY_FRESHWEBLITE", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "NODE_ENV",
].map((key) => [key, process.env[key]]));
const tempDir = await mkdtemp(join(tmpdir(), "fresh-research-route-"));
try {
  process.env.TAVILY_API_KEY = "test-only-not-a-real-key";
  process.env.PERSISTENCE_DRY_RUN = "true";
  process.env.SUPABASE_URL = "https://fresh-test.supabase.co";
  process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE = "test-only-supabase-secret-key";
  process.env.NODE_ENV = "test";

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
  let quotaCalls = 0;
  let quotaPayload = { allowed: true, remaining: 5, retryAfterSeconds: 0 };
  const fakeFetch = async (input, init) => {
    if (String(input).includes("/rest/v1/rpc/consume_fresh_research_quota")) {
      quotaCalls += 1;
      return new Response(JSON.stringify(quotaPayload), { status: 200, headers: { "content-type": "application/json" } });
    }
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
  globalThis.fetch = fakeFetch;

  // 1: Real HTTP handler, durable quota RPC, synthesis and dry-run persistence.
  const response = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.10" },
    body: JSON.stringify({ query: "controlled TRUEMODE integration test", mode: "quick", maxSources: 2 }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.answer, "Example research answer from controlled test data.");
  assert.equal(body.intelligencePersisted, false);
  assert.equal(body.persistence?.dryRun, true);
  assert.equal(body.persistence?.sources, 1);
  assert.equal(providerCalls, 1);
  assert.equal(quotaCalls, 1, "every valid request must consume a durable quota token");

  // 2: Low source coverage on a current-entity query triggers a news-specific recovery pass.
  let adaptiveCalls = [];
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("/rest/v1/rpc/consume_fresh_research_quota")) {
      quotaCalls += 1;
      return new Response(JSON.stringify({ allowed: true, remaining: 4, retryAfterSeconds: 0 }), { status: 200 });
    }
    const request = JSON.parse(String(init?.body ?? "{}"));
    adaptiveCalls.push(request);
    const newsPass = request.topic === "news";
    const results = newsPass
      ? [
          { title: "Independent report A", url: "https://news-a.example/musk", content: "Elon Musk leads technology companies and develops space systems.", published_date: "2026-11-20" },
          { title: "Independent report B", url: "https://news-b.example/musk", content: "Elon Musk leads technology companies and develops space systems.", published_date: "2026-11-20" },
          { title: "Independent report C", url: "https://news-c.example/musk", content: "Elon Musk leads technology companies and develops space systems.", published_date: "2026-11-20" },
        ]
      : [{ title: "Reference overview", url: "https://reference.example/musk", content: "Elon Musk leads technology companies and develops space systems." }];
    return new Response(JSON.stringify({ answer: "Elon Musk leads technology companies and develops space systems.", results }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const adaptive = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.10" },
    body: JSON.stringify({ query: "What's happening with Elon Musk?", mode: "global", maxSources: 8 }),
  }));
  assert.equal(adaptive.status, 200);
  const adaptiveBody = await adaptive.json();
  assert.equal(adaptiveCalls.length, 3);
  assert.ok(adaptiveCalls.some((call) => call.topic === "news"));
  assert.ok(adaptiveBody.verification.uniqueDomains >= 3);
  assert.ok(adaptiveBody.verification.newsSources >= 3);
  assert.equal(adaptiveBody.verification.passes, 3);

  // 3: A denied quota returns 429 before spending provider credits.
  quotaPayload = { allowed: false, remaining: 0, retryAfterSeconds: 17 };
  globalThis.fetch = fakeFetch;
  const beforeBlockedProviderCalls = providerCalls;
  const blocked = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.10" },
    body: JSON.stringify({ query: "quota blocked request", mode: "quick" }),
  }));
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("retry-after"), "17");
  assert.equal(providerCalls, beforeBlockedProviderCalls, "blocked requests must not call the paid provider");

  // 4: Invalid input is rejected before the quota service or provider is called.
  const quotasBeforeInvalid = quotaCalls;
  const invalid = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.10" }, body: JSON.stringify({ query: "   " }),
  }));
  assert.equal(invalid.status, 400);
  assert.equal(quotaCalls, quotasBeforeInvalid);

  // 5: A quota-service failure fails closed before any provider call.
  globalThis.fetch = async (input) => {
    if (String(input).includes("/rest/v1/rpc/consume_fresh_research_quota")) return new Response("database unavailable", { status: 503 });
    providerCalls += 1;
    return new Response("unexpected provider call", { status: 500 });
  };
  const beforeUnavailableProviderCalls = providerCalls;
  const unavailable = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.10" },
    body: JSON.stringify({ query: "quota service unavailable", mode: "quick" }),
  }));
  assert.equal(unavailable.status, 503);
  assert.equal(providerCalls, beforeUnavailableProviderCalls);

  // 6: If all research passes fail, return a truthful provider failure.
  globalThis.fetch = async (input) => {
    if (String(input).includes("/rest/v1/rpc/consume_fresh_research_quota")) {
      return new Response(JSON.stringify({ allowed: true, remaining: 3, retryAfterSeconds: 0 }), { status: 200 });
    }
    return new Response("provider unavailable", { status: 503 });
  };
  const failed = await POST(new Request("https://fresh.test/api/research/search", {
    method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.10" }, body: JSON.stringify({ query: "provider failure case", mode: "quick" }),
  }));
  assert.equal(failed.status, 504);
  assert.match((await failed.json()).error, /All web research passes failed/);

  console.log("Fresh research API dry-run integration tests: PASS (6 cases; mocked durable quota RPC; no database writes)");
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await rm(tempDir, { recursive: true, force: true });
}
