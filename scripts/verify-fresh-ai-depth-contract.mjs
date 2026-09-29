import fs from "node:fs";

const runtime=fs.readFileSync("src/core/fresh-ai/FreshAIPlatformRuntime.ts","utf8");
const trace=fs.readFileSync("src/core/fresh-ai/FreshAIObservability.ts","utf8");
const provider=fs.readFileSync("src/core/fresh-ai/FreshAIProviderRouter.ts","utf8");
const api=fs.readFileSync("api/ai/ask.ts","utf8");

for(const token of [
  "traceFreshAIStage","InMemoryFreshAITraceSink","requestId",
  "FreshAIProviderRouter","FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER",
  "createFreshAIIntelligenceGateway","TRUEMODE"
]){
  if(!runtime.includes(token)&&!trace.includes(token)&&!provider.includes(token)&&!api.includes(token))
    throw new Error("Fresh AI depth contract missing: "+token);
}
if((runtime.match(/\{ id: \d+, key:/g)||[]).length!==20) throw new Error("Fresh AI 20-step registry changed");
console.log("Fresh AI deep runtime contract: PASS");
