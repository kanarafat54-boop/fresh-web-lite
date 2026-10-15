import fs from "node:fs";
import path from "node:path";
const read = (p) => fs.readFileSync(p, "utf8");
const fail = (m) => { throw new Error(m); };
const ask = read("api/ai/ask.ts");
const gateway = read("src/core/fresh-ai/FreshAIIntelligenceGateway.ts");
const kernel = read("src/core/fresh-ai/FreshAIKernel.ts");
const treasury = read("api/finance/treasury.ts");

// 1) Fresh AI independence: no outside AI model is called anywhere in the API layer.
const OUTSIDE = ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "generativelanguage.googleapis.com", "geminiFetch", "api.openai.com", "api.anthropic.com", "api.deepseek.com"];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
for (const file of walk("api").filter((f) => /\.(ts|tsx|js|mjs)$/.test(f))) {
  const text = read(file);
  for (const token of OUTSIDE) if (text.includes(token)) fail(`${file} references an outside AI provider (${token}); Fresh AI must be independent`);
}
for (const must of ["createFreshAIIntelligenceGateway", "await gw.handle", "modelId"])
  if (!ask.includes(must)) fail(`ask.ts lost a required gateway token: ${must}`);

// 2) Regressions fixed by the audit
for (const [name, text] of [["api/ai/ask.ts", ask], ["FreshAIIntelligenceGateway.ts", gateway]])
  if (/\\\\[bsS]/.test(text)) fail(`${name} still contains over-escaped regex tokens (\\\\b, \\\\s or \\\\S)`);
if (!ask.includes("platformKnowledge") || !ask.includes('"fresh_ai_knowledge"')) fail("ask.ts does not retrieve platform knowledge");
if (!ask.includes('startsWith("fresh-e2ee-v1:")')) fail("ask.ts feeds placeholder e2ee turns back as history");
if (!kernel.includes('item.id.startsWith("kb-")')) fail("kernel does not answer directly from platform knowledge");
if (!treasury.includes("SUPABASE_SECRET_KEY_FRESHWEBLITE")) fail("treasury.ts does not prefer the Fresh Web Lite secret key");
if (!/VITE_SUPABASE_ANON_KEY\s*\?\?\s*process\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/.test(treasury)) fail("treasury.ts still prefers the legacy SUPABASE_PUBLISHABLE_KEY");
if (!treasury.includes("FRESH_TREASURY_SANDBOX")) fail("treasury.ts sandbox settlement is not gated");
console.log("Fresh AI independence + knowledge grounding + security contract: PASS");
