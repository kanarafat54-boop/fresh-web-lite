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
if (!stream.includes('if (process.env.FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER !== "true") return null')) throw new Error("Streaming external provider is not opt-in");
if (!live.includes('if (process.env.FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER !== "true") return null')) throw new Error("Live external provider is not opt-in");
if (!stream.includes("const fallback = result.result.answer")) throw new Error("Streaming lacks native answer fallback");
if (!live.includes("const fallback = result.result.answer")) throw new Error("Live streaming lacks native answer fallback");
if (!goal.includes("understandFreshGoal")) throw new Error("Fresh goal understanding module missing");

console.log("Fresh AI sovereign answer + goal-understanding boundary: PASS");
