import fs from "node:fs";

const ask=fs.readFileSync("api/ai/ask.ts","utf8");
const ui=fs.readFileSync("src/app/components/FreshAIUnified.tsx","utf8");
const shell=fs.readFileSync("src/app/AppShell.tsx","utf8");
const services=fs.readFileSync("src/core/fresh-ai/FreshAIServerServices.ts","utf8");

for(const required of ["createFreshAIIntelligenceGateway","fresh_ai_memory","fresh_ai_pipeline_events","persist(","generateFreshAIImage"]){if(!ask.includes(required))throw new Error(`Missing canonical Fresh AI ask contract: ${required}`)}
if(!services.includes("/v1/images/generations"))throw new Error("Fresh AI image provider endpoint is missing from server services")
if(!ui.includes("/api/ai/ask"))throw new Error("Unified Fresh AI UI is not using /api/ai/ask")
if(!shell.includes("FreshAIUnified"))throw new Error("AppShell is not using the unified Fresh AI UI")
if(shell.includes("GlobalFreshAI")||shell.includes("FreshAIMain")||shell.includes("FreshAIContextPanel"))throw new Error("Legacy duplicate Fresh AI surfaces are still mounted in AppShell")
for(const required of ["SUPABASE_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","gpt-image-2"]){if(!services.includes(required))throw new Error(`Missing server environment/provider contract: ${required}`)}
console.log("Fresh AI unified contract: PASS");
