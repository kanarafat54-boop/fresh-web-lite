const base = (process.argv[2] || process.env.FRESH_AI_SMOKE_BASE_URL || "").replace(/\/$/, "");
if (!base) throw new Error("Pass a deployment URL as argv[2] or FRESH_AI_SMOKE_BASE_URL.");
const checks = [];
async function check(name, path, init, accept) {
  const response = await fetch(new URL(path, base), { redirect: "manual", ...init });
  const body = await response.text();
  let json;
  try { json = JSON.parse(body); } catch { json = null; }
  const ok = accept(response, body, json);
  checks.push({ name, status: response.status, ok });
  if (!ok) throw new Error(`${name} failed: HTTP ${response.status}; body=${body.slice(0, 240)}`);
}
const post = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
await check("Fresh AI workspace serves", "/ai", {}, (r, body) => r.status === 200 && /Fresh Web Lite/i.test(body));
await check("ask endpoint rejects GET deliberately", "/api/ai/ask", {}, (r, _b) => r.status === 405 && /POST/i.test(r.headers.get("allow") || ""));
await check("ask endpoint validates empty request", "/api/ai/ask", post({}), (r, _b, j) => r.status === 400 && /goal is required/i.test(j?.error || ""));
await check("conversation sealing requires authentication", "/api/ai/conversations", post({ action: "seal-latest" }), (r, _b, j) => r.status === 401 && /authentication required/i.test(j?.error || ""));
await check("file processing requires authentication", "/api/ai/files", post({}), (r, _b, j) => r.status === 401 && /authentication required/i.test(j?.error || ""));
await check("media upload requires authentication", "/api/ai/upload", post({}), (r, _b, j) => r.status === 401 && /authentication required/i.test(j?.error || ""));
await check("research endpoint validates or truthfully reports missing provider configuration", "/api/research/search", post({}), (r, _b, j) => (r.status === 400 && /query is required/i.test(j?.error || "")) || (r.status === 503 && /not configured/i.test(j?.error || "")));
await check("unauthenticated conversation listing exposes no turns", "/api/ai/conversations", {}, (r, _b, j) => r.status === 200 && Array.isArray(j?.turns) && j.turns.length === 0);
console.log(JSON.stringify({ base, passed: checks.filter((x) => x.ok).length, total: checks.length, checks }, null, 2));
