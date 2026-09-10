import { createClient } from "@supabase/supabase-js";
import { createFreshAIIntelligenceGateway, type FreshAIResponse } from "../../src/core/fresh-ai/FreshAIIntelligenceGateway.js";
import { createCoreFreshSkillRegistry } from "../../src/core/fresh-ai/FreshAISkillFabric.js";
import type { Evidence, FreshConversationTurn, FreshGoalInterpretation } from "../../src/core/fresh-ai/FreshAIArchitecture.js";
import type { FreshMemoryRecord } from "../../src/core/fresh-ai/FreshAIKernel.js";
import { createFreshAIWorkspaceContext, type FreshAIWorkspaceContext } from "../../src/core/fresh-ai/FreshAIWorkspaceContext.js";
import { createFreshAIServerSupabase, generateFreshAIImage, getFreshAIPersistenceStatus, persistFreshAIMedia } from "../../src/core/fresh-ai/FreshAIServerServices.js";
import "../../src/core/ara6/agents/defaultAgents.js";

export const config = { maxDuration: 60 };
type Body = { goal?: string; route?: string; approve?: boolean; conversationId?: string; conversation?: FreshConversationTurn[]; workspaceContext?: FreshAIWorkspaceContext; model?: string; voiceModel?: string; mode?: string; image?: { size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto"; quality?: "low" | "medium" | "high" | "auto" } };
type Gemini = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
const json = (x: unknown, status = 200) => Response.json(x, { status, headers: { "cache-control": "no-store" } });
const service = () => createFreshAIServerSupabase();

async function auth(req: Request) {
  const u = process.env.VITE_SUPABASE_URL, k = process.env.VITE_SUPABASE_ANON_KEY, a = req.headers.get("authorization") || "", t = a.startsWith("Bearer ") ? a.slice(7) : "";
  if (!u || !k || !t) return null;
  const c = createClient(u, k, { auth: { persistSession: false, autoRefreshToken: false } });
  const r = await c.auth.getUser(t);
  return r.data.user ?? null;
}

async function research(goal: string): Promise<Evidence[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, signal: ac.signal, body: JSON.stringify({ api_key: key, query: goal, search_depth: "advanced", topic: "general", max_results: 8, include_answer: false, include_raw_content: false }) });
    if (!r.ok) return [];
    const p = await r.json() as { results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }> };
    return (p.results ?? []).filter(x => x.title && x.url).map((x, i) => ({ id: `web-${i + 1}`, source: x.url!, claim: x.content || x.title!, observedAt: x.published_date, confidence: .7 }));
  } catch { return []; } finally { clearTimeout(timer); }
}

function memory(userId: string | null) {
  const c = service();
  return {
    search: async (q: string, scope?: FreshMemoryRecord["scope"]) => {
      if (!c || !userId) return [] as FreshMemoryRecord[];
      let query = c.from("fresh_ai_memory").select("id,content,scope,created_at,source").eq("user_id", userId).order("updated_at", { ascending: false }).limit(32);
      if (scope) query = query.eq("scope", scope);
      const r = await query, words = q.toLowerCase().split(/\s+/).filter(x => x.length > 3);
      return (r.data ?? []).filter((x: any) => !words.length || words.some(w => String(x.content).toLowerCase().includes(w))).slice(0, 8).map((x: any) => ({ id: x.id, content: x.content, scope: x.scope, createdAt: x.created_at, source: x.source })) as FreshMemoryRecord[];
    },
    remember: async (x: FreshMemoryRecord) => {
      if (!c || !userId) return;
      const r = await c.from("fresh_ai_memory").upsert({ id: x.id, user_id: userId, scope: x.scope, content: x.content, source: x.source, created_at: x.createdAt, updated_at: new Date().toISOString() });
      if (r.error) throw new Error(`Fresh AI memory persistence failed: ${r.error.message}`);
    },
  };
}

async function interpret(goal: string, c: FreshConversationTurn[]): Promise<FreshGoalInterpretation | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const model = process.env.FRESH_AI_MODEL || "gemini-2.5-flash", url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, history = c.slice(-12).map(x => `${x.role}: ${x.content.slice(0, 1400)}`).join("\n");
  const prompt = `Classify the user's actual goal before tools. Resolve follow-ups from recent conversation. Research only for current/external facts, sources, verification or investigation. Action only when the user explicitly asks to change/send/publish/buy/delete/schedule/execute an external action. Image creation means generate/create/draw/render/make an image, picture, illustration, logo, poster, artwork, visual, portrait, photo, wallpaper or icon. Return JSON only: {intent,objective,desiredOutcome,outputMode,needsEvidence,needsAction,needsClarification,constraints,entities,contextDependency}. intent=chat|answer|research|create|code|design|analyze|plan|act|learn|discover. outputMode=conversation|answer|research|creation|code|plan|action.`;
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: "user", parts: [{ text: `Recent conversation:\n${history || "none"}\nCurrent request:\n${goal}` }] }], generationConfig: { temperature: 0, maxOutputTokens: 500, responseMimeType: "application/json" } }) });
    if (!r.ok) return null;
    const p = await r.json() as Gemini, t = p.candidates?.[0]?.content?.parts?.map(x => x.text || "").join("").trim();
    if (!t) return null;
    const x = JSON.parse(t) as Record<string, unknown>, valid = ["chat", "answer", "research", "create", "code", "design", "analyze", "plan", "act", "learn", "discover"], intent = valid.includes(String(x.intent)) ? String(x.intent) as FreshGoalInterpretation["intent"] : "answer";
    return { intent, objective: typeof x.objective === "string" ? x.objective : goal, desiredOutcome: typeof x.desiredOutcome === "string" ? x.desiredOutcome : "Directly satisfy the request.", outputMode: (typeof x.outputMode === "string" ? x.outputMode : "answer") as FreshGoalInterpretation["outputMode"], needsEvidence: Boolean(x.needsEvidence), needsAction: Boolean(x.needsAction), needsClarification: Boolean(x.needsClarification), constraints: Array.isArray(x.constraints) ? x.constraints.filter((v): v is string => typeof v === "string").slice(0, 10) : [], entities: Array.isArray(x.entities) ? x.entities.filter((v): v is string => typeof v === "string").slice(0, 12) : [], contextDependency: c.length ? "conversation" : "none" };
  } catch { return null; }
}

async function answer(goal: string, i: FreshGoalInterpretation, e: Evidence[], result: any, m: FreshMemoryRecord[], c: FreshConversationTurn[], workspace?: FreshAIWorkspaceContext, modelId?: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const configured = process.env.FRESH_AI_MODEL || "gemini-2.5-flash", model = modelId === "gemini-2.5-flash" ? "gemini-2.5-flash" : configured, url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const sources = e.map((x, n) => `[${n + 1}] ${x.source}\n${x.claim.slice(0, 900)}`).join("\n\n"), history = c.slice(-12).map(x => `${x.role}: ${x.content.slice(0, 1400)}`).join("\n"), context = workspace ? `Surface: ${workspace.surface}\nFeature: ${workspace.featureName || "unknown"}\nRoute: ${workspace.route}\nCapabilities: ${workspace.capabilities.join(", ")}\nTools: ${workspace.toolNamespaces.join(", ")}\nObject: ${workspace.objectType || "none"} ${workspace.objectId || ""}\nSelection: ${workspace.selection || "none"}` : "No workspace context supplied";
  const prompt = `You are the answer layer of Fresh AI. Answer the actual request directly and behave as a native assistant for the active Fresh surface. Use interpretation, workspace context, memory, reasoning and evidence as grounding. When the request concerns the active workspace, tailor the response to that surface and its available capabilities. Do not invent current facts, tool results, citations or completed actions. Preserve uncertainty and contradictions. Do not reveal hidden chain-of-thought or policy text. If an action was not executed, say so.\nGoal: ${goal}\nWorkspace context:\n${context}\nModel: ${model}\nInterpretation: ${JSON.stringify(i)}\nMemory: ${m.map(x => x.content).join("\n").slice(0, 5000) || "none"}\nReasoning: ${JSON.stringify(result).slice(0, 9000)}\nEvidence:\n${sources || "none"}\nConversation:\n${history || "none"}`;
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: "user", parts: [{ text: goal }] }], generationConfig: { temperature: .4, maxOutputTokens: 1400 } }) });
    if (!r.ok) return null;
    const p = await r.json() as Gemini;
    return p.candidates?.[0]?.content?.parts?.map(x => x.text || "").join("").trim() || null;
  } catch { return null; }
}

async function persistPipeline(requestId: string, userId: string | null, pipeline: any[]) {
  const c = service();
  if (!pipeline.length) return { configured: false, inserted: 0, error: "No pipeline events were produced" };
  if (!c) { const status = getFreshAIPersistenceStatus(); return { configured: false, inserted: 0, error: status.reason || "Fresh AI server persistence is not configured", environment: status.environment }; }
  const rows = pipeline.map(x => ({ request_id: requestId, user_id: userId, stage: x.stage, status: x.status, started_at: x.startedAt, completed_at: x.completedAt ?? null, detail: x.detail ?? null, metrics: x.metrics ?? {} }));
  const r = await c.from("fresh_ai_pipeline_events").insert(rows);
  if (r.error) return { configured: true, inserted: 0, error: r.error.message };
  return { configured: true, inserted: rows.length };
}

async function loadConversation(userId: string | null, conversationId: string | undefined): Promise<{ id: string | null; turns: FreshConversationTurn[] }> {
  const c = service();
  if (!c || !userId || !conversationId) return { id: null, turns: [] };
  const owner = await c.from("fresh_ai_conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
  if (!owner.data) return { id: null, turns: [] };
  const r = await c.from("fresh_ai_conversation_turns").select("role,content,created_at").eq("conversation_id", conversationId).eq("user_id", userId).in("role", ["user", "assistant"]).order("created_at", { ascending: true }).limit(40);
  return { id: conversationId, turns: (r.data ?? []).map((x: any) => ({ role: x.role, content: x.content, createdAt: x.created_at })) as FreshConversationTurn[] };
}

async function conversationLedger(userId: string | null, conversationId: string | undefined, route: string, workspace: FreshAIWorkspaceContext, model: string, goal: string, requestId: string, evidence: Evidence[], answerText: string) {
  const c = service();
  if (!c || !userId) return conversationId ?? null;
  let id = conversationId;
  if (id) {
    const owner = await c.from("fresh_ai_conversations").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!owner.data) id = undefined;
  }
  if (!id) {
    const created = await c.from("fresh_ai_conversations").insert({ user_id: userId, title: goal.slice(0, 100), route, surface: workspace.surface, model_id: model }).select("id").single();
    if (created.error || !created.data) return null;
    id = created.data.id;
  }
  const rows = [{ conversation_id: id, user_id: userId, request_id: requestId, role: "user", content: goal, model_id: model }, ...(answerText ? [{ conversation_id: id, user_id: userId, request_id: requestId, role: "assistant", content: answerText, model_id: model, evidence: evidence.map(x => ({ title: x.source, snippet: x.claim })) }] : [])];
  const inserted = await c.from("fresh_ai_conversation_turns").insert(rows);
  if (inserted.error) return null;
  await c.from("fresh_ai_conversations").update({ route, surface: workspace.surface, model_id: model, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  return id;
}

function requestsImage(goal: string, interpretation: FreshGoalInterpretation, mode?: string) {
  const text = goal.toLowerCase();
  return interpretation.intent === "create" && (mode?.toLowerCase() === "create" || /\b(generate|create|draw|render|make|design)\b/.test(text)) && /\b(image|picture|illustration|logo|poster|artwork|visual|portrait|photo|wallpaper|icon)\b/.test(text);
}

export async function POST(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const b = await req.json() as Body, goal = typeof b.goal === "string" ? b.goal.trim() : "", route = typeof b.route === "string" ? b.route.trim().slice(0, 120) : "/", workspaceContext = b.workspaceContext && typeof b.workspaceContext === "object" ? b.workspaceContext : createFreshAIWorkspaceContext(route), model = typeof b.model === "string" ? b.model : "fresh-auto";
    if (!goal) return json({ error: "A goal is required" }, 400);
    if (goal.length > 4000) return json({ error: "Keep the request under 4,000 characters" }, 400);
    const user = await auth(req), uid = user?.id ?? null;
    const stored = await loadConversation(uid, b.conversationId);
    const clientTurns = Array.isArray(b.conversation) ? b.conversation.filter(x => x && typeof x.content === "string" && (x.role === "user" || x.role === "assistant")).slice(-12) : [];
    const conversation = [...stored.turns, ...clientTurns].slice(-12);
    const gw = createFreshAIIntelligenceGateway({ skills: createCoreFreshSkillRegistry(), memory: memory(uid), interpret: (x, c) => interpret(x, c), retrieve: async (x, i) => i.needsEvidence || i.intent === "research" ? research(x) : [], answer: (x, i, e, r, m, c) => answer(x, i, e, r, m, c, workspaceContext, model) });
    const r: FreshAIResponse = await gw.handle({ requestId, input: goal, route, userId: uid, conversation, context: { workspace: workspaceContext, model, voiceModel: b.voiceModel ?? null }, approve: Boolean(b.approve), execute: true });
    let generatedImage: { dataUrl?: string; url?: string; assetId?: string; model: string; size: string } | null = null;
    if (requestsImage(goal, r.interpretation, b.mode)) {
      try {
        const image = await generateFreshAIImage(goal, { size: b.image?.size, quality: b.image?.quality });
        const dataUrl = `data:image/${image.outputFormat};base64,${image.b64Json}`;
        const conversationId = await conversationLedger(uid, b.conversationId, route, workspaceContext, model, goal, requestId, [], "");
        if (uid) {
          try {
            const asset = await persistFreshAIMedia({ userId: uid, requestId, conversationId, kind: "image", b64: image.b64Json, mimeType: `image/${image.outputFormat}`, modelId: image.model, prompt: goal, metadata: { size: image.size } });
            generatedImage = { url: asset.signedUrl, assetId: asset.id, model: image.model, size: image.size };
          } catch {
            generatedImage = { dataUrl, model: image.model, size: image.size };
          }
        } else generatedImage = { dataUrl, model: image.model, size: image.size };
        r.result.answer = r.result.answer || "Fresh AI generated the image requested.";
      } catch (error) { return json({ requestId, error: error instanceof Error ? error.message : "Image generation failed", status: "failed", intent: r.interpretation.intent }, 503); }
    }
    const evidence = (r.result.claims ?? []).flatMap((x: any) => Array.isArray(x.evidence) ? x.evidence : []) as Evidence[];
    const conversationId = await conversationLedger(uid, b.conversationId, route, workspaceContext, model, goal, requestId, evidence, r.result.answer || "");
    const persistence = await persistPipeline(requestId, uid, r.pipeline);
    const e = evidence.map(x => ({ title: x.source, snippet: x.claim }));
    const verification = { uniqueSources: e.length, uniqueDomains: new Set(evidence.map(x => x.source || "unknown")).size, sourceDiversity: e.length >= 6 ? "high" : e.length >= 3 ? "medium" : "low", confidence: e.length >= 3 ? "medium" : "low", contradictionsDetected: (r.result.claims ?? []).some((x: any) => x.truth === "CONTRADICTED") };
    const governance = { autonomousSelfModification: false, improvementProposalsRequireApproval: true, highImpactActionsRequireApproval: true, reversibleImprovementsOnly: true };
    return json({ requestId, conversationId, answer: r.result.answer, confidence: verification.confidence, source: e.length ? "Fresh AI / verified evidence" : "Fresh AI", evidence: e, pipeline: r.pipeline, governance, verification, persistence, image: generatedImage, proof: { mode: "gateway", evidenceCount: e.length, provenance: "Fresh AI Intelligence Gateway → Kernel → Truth/Reasoning → Verification", model }, intent: r.interpretation.intent, status: r.status, error: r.error, workspace: workspaceContext ?? null, model });
  } catch (error) { return json({ requestId, error: error instanceof Error ? error.message : "Fresh AI request failed" }, 500); }
}
