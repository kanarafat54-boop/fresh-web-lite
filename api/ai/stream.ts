import { createClient } from "@supabase/supabase-js";
import { createFreshAIIntelligenceGateway } from "../../src/core/fresh-ai/FreshAIIntelligenceGateway.js";
import { createCoreFreshSkillRegistry } from "../../src/core/fresh-ai/FreshAISkillFabric.js";
import type { Evidence, FreshConversationTurn, FreshGoalInterpretation } from "../../src/core/fresh-ai/FreshAIArchitecture.js";
import type { FreshMemoryRecord } from "../../src/core/fresh-ai/FreshAIKernel.js";
import { createFreshAIWorkspaceContext, type FreshAIWorkspaceContext } from "../../src/core/fresh-ai/FreshAIWorkspaceContext.js";
import "../../src/core/ara6/agents/defaultAgents.js";

export const config = { maxDuration: 60 };

type Body = { goal?: string; route?: string; approve?: boolean; conversation?: FreshConversationTurn[]; workspaceContext?: FreshAIWorkspaceContext; model?: string; voiceModel?: string };
type Gemini = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

const encoder = new TextEncoder();
const event = (type: string, payload: unknown) => encoder.encode(`data: ${JSON.stringify({ type, ...((payload && typeof payload === "object") ? payload : { value: payload })})}\n\n`);
const service = () => { const u = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, k = process.env.SUPABASE_SERVICE_ROLE_KEY; return u && k ? createClient(u, k, { auth: { persistSession: false, autoRefreshToken: false } }) : null; };

async function auth(req: Request) {
  const u = process.env.VITE_SUPABASE_URL, k = process.env.VITE_SUPABASE_ANON_KEY, a = req.headers.get("authorization") || "", t = a.startsWith("Bearer ") ? a.slice(7) : "";
  if (!u || !k || !t) return null;
  const c = createClient(u, k, { auth: { persistSession: false, autoRefreshToken: false } });
  const r = await c.auth.getUser(t);
  return r.data.user ?? null;
}

function memory(userId: string | null) {
  const c = service();
  return {
    search: async (q: string, scope?: FreshMemoryRecord["scope"]) => {
      if (!c || !userId) return [] as FreshMemoryRecord[];
      let query = c.from("fresh_ai_memory").select("id,content,scope,created_at,source").eq("user_id", userId).order("updated_at", { ascending: false }).limit(24);
      if (scope) query = query.eq("scope", scope);
      const r = await query;
      const words = q.toLowerCase().split(/\s+/).filter((x) => x.length > 3);
      return (r.data ?? []).filter((x: any) => !words.length || words.some((w) => String(x.content).toLowerCase().includes(w))).slice(0, 8).map((x: any) => ({ id: x.id, content: x.content, scope: x.scope, createdAt: x.created_at, source: x.source })) as FreshMemoryRecord[];
    },
    remember: async (x: FreshMemoryRecord) => { if (c && userId) await c.from("fresh_ai_memory").upsert({ id: x.id, user_id: userId, scope: x.scope, content: x.content, source: x.source, created_at: x.createdAt, updated_at: new Date().toISOString() }); },
  };
}

async function interpret(goal: string, conversation: FreshConversationTurn[]): Promise<FreshGoalInterpretation | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const model = process.env.FRESH_AI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const history = conversation.slice(-8).map((x) => `${x.role}: ${x.content.slice(0, 1200)}`).join("\n");
  const prompt = `Classify the user's actual goal before tools. Resolve follow-ups from recent conversation. Return JSON only: {intent,objective,desiredOutcome,outputMode,needsEvidence,needsAction,needsClarification,constraints,entities,contextDependency}. intent=chat|answer|research|create|code|design|analyze|plan|act|learn|discover. outputMode=conversation|answer|research|creation|code|plan|action. Research only for current/external facts, sources, verification or investigation. Action only when explicitly requested.`;
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: "user", parts: [{ text: `Recent conversation:\n${history || "none"}\nCurrent request:\n${goal}` }] }], generationConfig: { temperature: 0, maxOutputTokens: 500, responseMimeType: "application/json" } }) });
    if (!r.ok) return null;
    const p = await r.json() as Gemini, t = p.candidates?.[0]?.content?.parts?.map((x) => x.text || "").join("").trim();
    if (!t) return null;
    const x = JSON.parse(t) as Record<string, unknown>, valid = ["chat", "answer", "research", "create", "code", "design", "analyze", "plan", "act", "learn", "discover"];
    return { intent: (valid.includes(String(x.intent)) ? String(x.intent) : "answer") as FreshGoalInterpretation["intent"], objective: typeof x.objective === "string" ? x.objective : goal, desiredOutcome: typeof x.desiredOutcome === "string" ? x.desiredOutcome : "Directly satisfy the request.", outputMode: (typeof x.outputMode === "string" ? x.outputMode : "answer") as FreshGoalInterpretation["outputMode"], needsEvidence: Boolean(x.needsEvidence), needsAction: Boolean(x.needsAction), needsClarification: Boolean(x.needsClarification), constraints: Array.isArray(x.constraints) ? x.constraints.filter((v): v is string => typeof v === "string").slice(0, 10) : [], entities: Array.isArray(x.entities) ? x.entities.filter((v): v is string => typeof v === "string").slice(0, 12) : [], contextDependency: conversation.length ? "conversation" : "none" };
  } catch { return null; }
}

async function research(goal: string): Promise<Evidence[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ api_key: key, query: goal, search_depth: "advanced", topic: "general", max_results: 8, include_answer: false }) });
    if (!r.ok) return [];
    const p = await r.json() as { results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }> };
    return (p.results ?? []).filter((x) => x.title && x.url).map((x, i) => ({ id: `web-${i + 1}`, source: x.url!, claim: x.content || x.title!, observedAt: x.published_date, confidence: .7 }));
  } catch { return []; }
}

async function streamGemini(goal: string, interpretation: FreshGoalInterpretation, response: { result: { answer?: string }; universal?: { surface: string; capabilities: string[]; powers: string[]; modelId: string; voiceModelId: string } }, evidence: Evidence[], memoryHits: FreshMemoryRecord[], workspace: FreshAIWorkspaceContext | undefined, modelId: string | undefined, signal: AbortSignal) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const configured = process.env.FRESH_AI_MODEL || "gemini-2.5-flash";
  const model = modelId === "gemini-2.5-flash" ? "gemini-2.5-flash" : configured;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
  const context = workspace ? `Surface: ${workspace.surface}\nFeature: ${workspace.featureName || "unknown"}\nRoute: ${workspace.route}\nCapabilities: ${workspace.capabilities.join(", ")}\nTools: ${workspace.toolNamespaces.join(", ")}` : "No workspace context supplied";
  const sources = evidence.map((x, i) => `[${i + 1}] ${x.source}\n${x.claim.slice(0, 900)}`).join("\n\n");
  const prompt = `You are Fresh AI's streaming answer layer. Answer directly. Use the interpretation, workspace, memory and evidence as grounding. Do not invent current facts, tool results, citations or completed actions. Preserve uncertainty. Do not reveal hidden chain-of-thought.\nGoal: ${goal}\nWorkspace:\n${context}\nModel: ${model}\nInterpretation: ${JSON.stringify(interpretation)}\nMemory:\n${memoryHits.map((x) => x.content).join("\n").slice(0, 5000) || "none"}\nGateway result:\n${JSON.stringify(response.result).slice(0, 9000)}\nEvidence:\n${sources || "none"}`;
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, signal, body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: "user", parts: [{ text: goal }] }], generationConfig: { temperature: .4, maxOutputTokens: 1400 } }) });
  if (!r.ok || !r.body) return null;
  return r.body;
}

export async function POST(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const user = await auth(req);
  const controller = new AbortController();
  req.signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const b = await req.json() as Body;
    const goal = typeof b.goal === "string" ? b.goal.trim() : "";
    const route = typeof b.route === "string" ? b.route.trim().slice(0, 120) : "/ai";
    const conversation = Array.isArray(b.conversation) ? b.conversation.filter((x) => x && typeof x.content === "string" && (x.role === "user" || x.role === "assistant")).slice(-8) : [];
    const workspace = b.workspaceContext && typeof b.workspaceContext === "object" ? b.workspaceContext : createFreshAIWorkspaceContext(route);
    if (!goal) return new Response(JSON.stringify({ error: "A goal is required" }), { status: 400, headers: { "content-type": "application/json" } });
    if (goal.length > 4000) return new Response(JSON.stringify({ error: "Keep the request under 4,000 characters" }), { status: 400, headers: { "content-type": "application/json" } });
    const uid = user?.id ?? null;
    const gateway = createFreshAIIntelligenceGateway({ skills: createCoreFreshSkillRegistry(), memory: memory(uid), interpret: (x, c) => interpret(x, c), retrieve: async (x, i) => i.needsEvidence || i.intent === "research" ? research(x) : [] });
    const result = await gateway.handle({ requestId, input: goal, route, userId: uid, conversation, context: { workspace, model: b.model ?? "fresh-auto", voiceModel: b.voiceModel ?? null }, approve: Boolean(b.approve), execute: true });
    const memoryHits = await memory(uid).search(goal);
    const evidence = (result.result.claims ?? []).flatMap((x: any) => Array.isArray(x.evidence) ? x.evidence : []) as Evidence[];
    const body = await streamGemini(goal, result.interpretation, result, evidence, memoryHits, workspace, b.model, controller.signal);
    const verification = { evidenceCount: evidence.length, confidence: evidence.length >= 3 ? "medium" : "low", contradictionsDetected: (result.result.claims ?? []).some((x: any) => x.truth === "CONTRADICTED") };
    const stream = new ReadableStream<Uint8Array>({ async start(controllerOut) {
      controllerOut.enqueue(event("start", { requestId, status: result.status, intent: result.interpretation.intent, workspace, universal: result.universal, verification }));
      if (!body) {
        const fallback = result.result.answer || "Fresh AI completed the request without a text answer.";
        controllerOut.enqueue(event("token", { text: fallback }));
        controllerOut.enqueue(event("done", { requestId, model: b.model ?? "fresh-auto", verification }));
        controllerOut.close(); return;
      }
      const reader = body.getReader(), decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true });
          const lines = buffer.split(/\r?\n/); buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim(); if (!raw || raw === "[DONE]") continue;
            try { const parsed = JSON.parse(raw) as Gemini; const text = parsed.candidates?.[0]?.content?.parts?.map((x) => x.text || "").join("") || ""; if (text) controllerOut.enqueue(event("token", { text })); } catch { /* ignore malformed upstream SSE frame */ }
          }
        }
        controllerOut.enqueue(event("done", { requestId, model: b.model ?? "fresh-auto", verification, evidence }));
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") controllerOut.enqueue(event("error", { error: error instanceof Error ? error.message : "Streaming failed" }));
      } finally { controllerOut.close(); }
    }, cancel() { controller.abort(); } });
    return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
  } catch (error) {
    return new Response(JSON.stringify({ requestId, error: error instanceof Error ? error.message : "Fresh AI stream failed" }), { status: 500, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
}
