import fs from "node:fs";
const ask=fs.readFileSync("api/ai/ask.ts","utf8"), ui=fs.readFileSync("src/app/components/FreshAIUnified.tsx","utf8"), shell=fs.readFileSync("src/app/AppShell.tsx","utf8"), services=fs.readFileSync("src/core/fresh-ai/FreshAIServerServices.ts","utf8"), history=fs.readFileSync("api/ai/conversations.ts","utf8"), rich=fs.readFileSync("src/app/components/FreshAIRichText.tsx","utf8");
for(const required of ["createFreshAIIntelligenceGateway","fresh_ai_memory","fresh_ai_pipeline_events","persistPipeline","generateFreshAIImage","loadConversation","conversationLedger","conversationId"]){if(!ask.includes(required))throw new Error(`Missing canonical Fresh AI ask contract: ${required}`)}
for(const required of ["/v1/images/generations","persistFreshAIMedia","fresh-ai-media"]){if(!services.includes(required))throw new Error(`Missing Fresh AI media contract: ${required}`)}
for(const required of ["/api/ai/ask","/api/ai/conversations","FreshAIRichText","speechSynthesis","AbortController","👍","👎"]){if(!ui.includes(required))throw new Error(`Missing unified Fresh AI UX contract: ${required}`)}
if(!history.includes("fresh_ai_conversation_turns")||!history.includes("auth"))throw new Error("Conversation history boundary is incomplete")
if(!rich.includes("```")||!rich.includes("<pre>"))throw new Error("Rich text code rendering is incomplete")
if(!shell.includes("FreshAIUnified"))throw new Error("AppShell is not using the unified Fresh AI UI")
if(shell.includes("GlobalFreshAI")||shell.includes("FreshAIMain")||shell.includes("FreshAIContextPanel"))throw new Error("Legacy duplicate Fresh AI surfaces are still mounted in AppShell")
for(const required of ["SUPABASE_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","gpt-image-2"]){if(!services.includes(required))throw new Error(`Missing server environment/provider contract: ${required}`)}
console.log("Fresh AI unified contract: PASS");
