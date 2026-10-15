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

if (!response.ok) {
  throw new Error(`Fresh AI request failed (HTTP ${response.status}): ${payload.error || raw.slice(0, 400)}`);
}

if (payload.status !== "completed") {
  throw new Error(`Fresh AI did not complete the request: ${payload.status || "missing status"}; ${payload.error || "no error detail"}`);
}

const answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
const normalized = answer.toLowerCase();
if (!answer || !normalized.includes("shorts") || !(normalized.includes("podcasts") || normalized.includes("music"))) {
  throw new Error(`Fresh AI did not return grounded Fresh Flow knowledge. Answer was: ${answer || "(empty)"}`);
}

console.log("Fresh AI production smoke test: PASS");
console.log(`HTTP ${response.status}; status=${payload.status}; endpoint returned Fresh Flow knowledge.`);
console.log(`Answer preview: ${answer.slice(0, 280)}`);
