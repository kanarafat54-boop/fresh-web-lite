import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const gateway = read("src/core/fresh-ai/FreshAIIntelligenceGateway.ts");
const goal = read("src/core/fresh-ai/FreshGoalUnderstanding.ts");
const kernel = read("src/core/fresh-ai/FreshAIKernel.ts");
const ask = read("api/ai/ask.ts");
const stream = read("api/ai/stream.ts");

if (!gateway.includes("understandFreshGoal(input,conversation,r.intent)")) throw new Error("Gateway is not using Fresh-owned goal understanding");
if (!gateway.includes('process.env.FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER==="true"')) throw new Error("External answer provider is not explicitly opt-in");
if (!gateway.includes("const externalAnswer=allowExternalAnswerProvider")) throw new Error("Gateway can still replace native answers without the sovereign boundary");
if (!gateway.includes("externalAnswer&&!looksLikeInternalInterpretation(externalAnswer)")) throw new Error("External answer is not guarded before replacing the native result");
if (!kernel.includes("buildGroundedAnswer")) throw new Error("Kernel native answer layer is missing");
if (!kernel.includes("provider-independent goal-understanding boundary")) throw new Error("Native answer layer does not identify the Fresh-owned reasoning boundary");
if (!goal.includes("understandFreshGoal")) throw new Error("Fresh goal understanding module missing");

// The canonical HTTP answer surface must delegate execution to the Fresh gateway.
// External interpretation/answer helpers may exist only as optional gateway dependencies;
// the gateway remains the authority that decides whether they can run.
if (!ask.includes("createFreshAIIntelligenceGateway")) throw new Error("Ask endpoint does not use the Fresh AI gateway");
if (!ask.includes("await gw.handle")) throw new Error("Ask endpoint does not execute through the Fresh AI gateway");
if (!ask.includes("modelId")) throw new Error("Ask endpoint does not preserve the canonical model boundary");
if (!ask.includes("process.env.GEMINI_API_KEY") && !ask.includes("process.env.GOOGLE_GENERATIVE_AI_API_KEY")) {
  // No external provider code is fine; this branch is intentionally informational.
} else if (!ask.includes("answer:")) {
  throw new Error("External answer implementation is present but the endpoint has no gateway answer boundary");
}

if (!stream.includes("createFreshAIIntelligenceGateway")) throw new Error("Stream endpoint does not use the Fresh AI gateway");
if (!stream.includes("await gateway.handle")) throw new Error("Stream endpoint does not execute through the Fresh AI gateway");
if (!stream.includes("result.result.answer")) throw new Error("Stream endpoint lacks the native Fresh answer result");
if (stream.includes("streamGemini") || stream.includes("GEMINI_API_KEY") || stream.includes("GOOGLE_GENERATIVE_AI_API_KEY") || stream.includes("generativelanguage.googleapis.com")) {
  throw new Error("Stream endpoint contains a direct external provider answer path");
}

console.log("Fresh AI sovereign answer + goal-understanding boundary: PASS");
