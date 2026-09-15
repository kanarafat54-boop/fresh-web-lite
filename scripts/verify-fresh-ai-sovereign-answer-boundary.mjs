import fs from "node:fs";

const gateway = fs.readFileSync("src/core/fresh-ai/FreshAIIntelligenceGateway.ts", "utf8");
const goal = fs.readFileSync("src/core/fresh-ai/FreshGoalUnderstanding.ts", "utf8");
const kernel = fs.readFileSync("src/core/fresh-ai/FreshAIKernel.ts", "utf8");
const stream = fs.readFileSync("api/ai/stream.ts", "utf8");
const live = fs.readFileSync("api/ai/live-stream.ts", "utf8");

if (!gateway.includes("understandFreshGoal(input,conversation,r.intent)")) throw new Error("Gateway is not using Fresh-owned goal understanding");
if (!gateway.includes('process.env.FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER==="true"')) throw new Error("External answer provider is not explicitly opt-in");
if (!gateway.includes("const externalAnswer=allowExternalAnswerProvider")) throw new Error("Gateway can still replace native answers without the sovereign boundary");
if (!kernel.includes("buildGroundedAnswer")) throw new Error("Kernel native answer layer is missing");
if (!kernel.includes("provider-independent goal-understanding boundary")) throw new Error("Native answer layer does not identify the Fresh-owned reasoning boundary");
if (!goal.includes("understandFreshGoal")) throw new Error("Fresh goal understanding module missing");

// Stream and live-stream are now native-only answer surfaces. They must call the
// canonical Fresh gateway and must not contain a vendor answer implementation.
for (const [name, source] of [["stream", stream], ["live", live]]) {
  if (!source.includes("createFreshAIIntelligenceGateway")) throw new Error(`${name} stream does not use the Fresh AI gateway`);
  if (!source.includes("await gateway.handle")) throw new Error(`${name} stream does not execute through the Fresh AI gateway`);
  if (!source.includes("result.result.answer")) throw new Error(`${name} stream lacks the native Fresh answer result`);
  if (source.includes("streamGemini") || source.includes("GEMINI_API_KEY") || source.includes("GOOGLE_GENERATIVE_AI_API_KEY") || source.includes("generativelanguage.googleapis.com")) {
    throw new Error(`${name} stream contains a direct external provider answer path`);
  }
}

console.log("Fresh AI sovereign answer + goal-understanding boundary: PASS");
