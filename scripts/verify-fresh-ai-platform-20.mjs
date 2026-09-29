import fs from "node:fs";

const runtime = fs.readFileSync("src/core/fresh-ai/FreshAIPlatformRuntime.ts", "utf8");
const gateway = fs.readFileSync("src/core/fresh-ai/FreshAIIntelligenceGateway.ts", "utf8");
const kernel = fs.readFileSync("src/core/fresh-ai/FreshAIKernel.ts", "utf8");
const api = fs.readFileSync("api/ai/ask.ts", "utf8");

const required = [
  "FRESH_AI_PLATFORM_20",
  "createFreshAIPlatformRuntime",
  "FreshAIIntelligenceGateway",
  "FreshAIKernel",
  "Fresh Unified",
  "FreshGoalUnderstanding",
  "Cross-app Memory",
  "Context Switching Intelligence",
  "AI Skills Marketplace",
  "Autonomous Engineering Workspace",
  "Fresh Knowledge Network",
  "Recommendation Intelligence",
  "AI Media Intelligence",
  "Trust Layer",
  "AI Observability",
  "Secure AI API Boundary",
  "Provider/Runtime Fallbacks",
  "Universal AI UI",
  "Fresh AI Certification",
];
for (const token of required) {
  if (!runtime.includes(token) && !gateway.includes(token) && !kernel.includes(token) && !api.includes(token)) {
    throw new Error("Fresh AI platform contract missing: " + token);
  }
}
const count = (runtime.match(/\{ id: \d+, key:/g) || []).length;
if (count !== 20) throw new Error("Fresh AI platform must contain exactly 20 coordinated steps");
if (!gateway.includes("assertFreshUnifiedModelIntegrity")) throw new Error("Gateway is not model-bound");
if (!gateway.includes("TRUEMODE blocked execution")) throw new Error("Gateway does not preserve fail-closed truth execution");
if (!api.includes("createFreshAIIntelligenceGateway")) throw new Error("AI API boundary is not wired to the gateway");
console.log("Fresh AI 1-20 coordinated platform contract: PASS");
