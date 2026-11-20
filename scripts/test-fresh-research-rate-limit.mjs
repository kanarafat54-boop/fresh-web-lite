import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalFetch = globalThis.fetch;
const original = {
  apiKey: process.env.TAVILY_API_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE,
  dryRun: process.env.PERSISTENCE_DRY_RUN,
  nodeEnv: process.env.NODE_ENV,
};
const tempDir = await mkdtemp(join(tmpdir(), "fresh-research-rate-limit-"));
try {
  process.env.TAVILY_API_KEY = "test-only-not-a-real-key";
  process.env.SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE = "test-only-service-secret";
  process.env.PERSISTENCE_DRY_RUN = "true";
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
  let rpcCalls = 0;
  let blockRateLimit = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/rest/v1/rpc/consume_fresh_research_quota")) {
      rpcCalls += 1;
      const payload = JSON.parse(String(init?.body ?? "{}"));
      assert.equal(payload.p_identifier_hash, createHmac("sha256", "test-only-service-secret").update("fresh-research:v1:203.0.113.10").digest("hex"));
      return Response.json({
        allowed: !blockRateLimit,
        remaining: blockRateLimit ? 0 : 5,
        retryAfterSeconds: blockRateLimit ? 247 : 0,
        limits: { perMinute: 6, perHour: 30, perDay: 100 },
      });
    }
    providerCalls += 1;
    return Response.json({
      answer: "A controlled research result.",
      results: [{
        title: "Controlled source",
        url: "https://example.test/research",
        content: "Controlled evidence for the rate-limit test.",
      }],
    });
  };

  const makeRequest = () => new Request("https://fresh.test/api/research/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.11" },
    body: JSON.stringify({ query: "controlled research rate-limit test", mode: "quick" }),
  });

  const signedIp = "203.0.113.10";
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", "test-only-service-secret")
    .update("fresh-research-forwarded-v1:" + signedIp + ":" + timestamp)
    .digest("hex");
  const signedRequest = () => {
    const request = makeRequest();
    const headers = new Headers(request.headers);
    headers.set("x-fresh-research-client-ip", signedIp);
    headers.set("x-fresh-research-client-timestamp", timestamp);
    headers.set("x-fresh-research-client-signature", signature);
    return new Request(request, { headers });
  };
  const allowed = await POST(signedRequest());
  assert.equal(allowed.status, 200, "requests within the database quota remain available");
  assert.equal(rpcCalls, 1);
  assert.equal(providerCalls, 1);

  blockRateLimit = true;
  const beforeBlockedProviderCalls = providerCalls;
  const blocked = await POST(signedRequest());
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("retry-after"), "247");
  assert.equal(blocked.headers.get("x-ratelimit-limit"), "6");
  assert.equal(blocked.headers.get("x-ratelimit-limit-hour"), "30");
  assert.equal(blocked.headers.get("x-ratelimit-limit-day"), "100");
  assert.equal(blocked.headers.get("x-ratelimit-remaining"), "0");
  assert.equal(providerCalls, beforeBlockedProviderCalls, "blocked requests must not spend provider credits");
  assert.equal(rpcCalls, 2);

  process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE = "";
  const unavailable = await POST(makeRequest());
  assert.equal(unavailable.status, 503, "rate-limit storage failures fail closed");
  assert.equal(providerCalls, beforeBlockedProviderCalls);

  console.log("Fresh Research multi-window quota route tests: PASS (allowed, blocked, fail-closed)");
} finally {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries({
    TAVILY_API_KEY: original.apiKey,
    SUPABASE_URL: original.supabaseUrl,
    SUPABASE_SECRET_KEY_FRESHWEBLITE: original.supabaseKey,
    PERSISTENCE_DRY_RUN: original.dryRun,
    NODE_ENV: original.nodeEnv,
  })) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  await rm(tempDir, { recursive: true, force: true });
}
