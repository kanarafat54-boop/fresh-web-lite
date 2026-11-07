import { evaluateAskPayload } from "./fresh-ai-smoke-assertions.mjs";

const endpoint = process.env.FRESH_AI_SMOKE_URL || "https://fresh-web-lite.vercel.app/api/ai/ask";
const goal = "Explain Fresh Flow and list the media formats available in it.";

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    goal,
    route: "/fresh-ai",
    model: "fresh-unified-1",
  }),
  signal: AbortSignal.timeout(25_000),
});

const raw = await response.text();
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  throw new Error(`Fresh AI returned non-JSON (HTTP ${response.status}): ${raw.slice(0, 400)}`);
}

const verdict = evaluateAskPayload(payload, response.status);
if (!verdict.ok) throw new Error(`Fresh AI production smoke failed: ${verdict.problems.join("; ")}. Answer was: ${String(payload.answer ?? "").slice(0, 300) || "(empty)"}`);
const answer = payload.answer.trim();

console.log("Fresh AI production smoke test: PASS");
console.log(`HTTP ${response.status}; status=${payload.status}; mode=${verdict.mode}; evidence items=${payload.evidence.length}.`);
console.log(`Answer preview: ${answer.slice(0, 280)}`);
