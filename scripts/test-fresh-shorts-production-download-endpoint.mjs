import assert from "node:assert/strict";

const base = process.env.FRESH_SHORTS_PRODUCTION_URL || "https://fresh-web-lite.vercel.app";
const endpoint = new URL("/api/ai/ask?__fresh_short_download=1", base);
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: "Bearer invalid-fresh-shorts-smoke-token" },
  body: JSON.stringify({ shortId: "22222222-2222-4222-8222-222222222222" }),
});
const payload = await response.json().catch(() => ({}));

assert.equal(
  response.status,
  401,
  `Production download endpoint must reject an invalid Fresh ID token with 401; received ${response.status}: ${JSON.stringify(payload)}`,
);
console.log("fresh-shorts-production-download-endpoint: invalid token rejected with 401");
