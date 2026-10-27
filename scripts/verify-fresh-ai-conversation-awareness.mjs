import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
const fail = (m) => { throw new Error(m); };
const kernel = read("src/core/fresh-ai/FreshAIKernel.ts");
const engines = read("src/core/fresh-ai/FreshNativeDimensionalEngines.ts");
const ask = read("api/ai/ask.ts");
const stream = read("api/ai/stream.ts");
const feedback = read("api/ai/feedback.ts");
const ui = read("src/app/components/FreshAIUnified.tsx");
const knowledge = read("src/core/fresh-ai/FreshAIPlatformKnowledge.ts");
const status = read("src/server/freshAIStatus.ts");
const vercel = read("vercel.json");

if (!kernel.includes("request.conversation??[]")) fail("kernel does not use conversation context");
if (!kernel.includes("resolveContextDependency(request.input,safeMemories,request.conversation??[])")) fail("kernel does not resolve conversational dependencies");
if (!kernel.includes('item.id.startsWith("kb-")')) fail("kernel does not answer from platform knowledge evidence");
if (!engines.includes("Fresh Native 3D Geometry Engine") || !engines.includes("Generated vehicle") || !engines.includes("Generated tree")) fail("native 3D generation contract is missing");
if (!ask.includes("platformKnowledge") || !ask.includes("generateFreshAIImage")) fail("ask endpoint lost platform retrieval or image generation");
if (!ask.includes("No external AI model API was required")) fail("native artifact reply lost its independence statement");
if (!stream.includes("retrieveFreshPlatformKnowledge(service(), x)")) fail("stream endpoint does not retrieve platform knowledge");
if (!knowledge.includes("search_fresh_platform_knowledge") || !knowledge.includes("simple word matching")) fail("shared knowledge retrieval or its fallback is missing");
if (!feedback.includes("fresh_ai_preference_pairs") || !feedback.includes("safety_checked: false")) fail("feedback API does not quarantine shared corrections");
// Consent contract (api/ai/feedback.ts): corrections are stored only with explicit, versioned training consent,
// and the legacy `share` flag must stay ignored so old clients cannot bypass it.
if (!feedback.includes("body.trainingConsent !== CONSENT") || !feedback.includes("body.consentVersion !== CONSENT_VERSION")) fail("feedback API stores corrections without explicit versioned consent");
if (!feedback.includes("Legacy `share` flags are deliberately ignored") || /body\.share\s*===\s*true/.test(feedback)) fail("feedback API must ignore the legacy share flag");
if (!ui.includes("not shared unless you choose to share it") || !ui.includes("Explicit training consent") || !ui.includes('trainingConsent: "explicit-training-opt-in"') || !ui.includes('consentVersion: "fresh-ai-feedback-consent-v1"')) fail("UI does not ask for explicit versioned consent before sharing a correction");
if (!status.includes("FRESH_UNIFIED_MODEL.weightsStatus")) fail("status endpoint does not report canonical checkpoint readiness");
if (!ask.includes("__fresh_ai_status") || !vercel.includes('"src": "/api/ai/status"') || !vercel.includes('"dest": "/api/ai/ask?__fresh_ai_status=1"')) fail("status endpoint is not routed through the existing Vercel function");
console.log("Fresh AI conversation awareness + knowledge retrieval + consent-gated learning contract: PASS");
