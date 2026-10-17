import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { handleFreshAIStatus } from "../../src/server/freshAIStatus.js";
import { createClient } from "@supabase/supabase-js";
import { createFreshAIIntelligenceGateway, type FreshAIResponse } from "../../src/core/fresh-ai/FreshAIIntelligenceGateway.js";
import { createCoreFreshSkillRegistry } from "../../src/core/fresh-ai/FreshAISkillFabric.js";
import type { Evidence, FreshConversationTurn, FreshGoalInterpretation } from "../../src/core/fresh-ai/FreshAIArchitecture.js";
import type { FreshMemoryRecord } from "../../src/core/fresh-ai/FreshAIKernel.js";
import { createFreshAIWorkspaceContext, type FreshAIWorkspaceContext } from "../../src/core/fresh-ai/FreshAIWorkspaceContext.js";
import { createFreshAIServerSupabase, generateFreshAIImage, getFreshAIPersistenceStatus, persistFreshAIMedia } from "../../src/core/fresh-ai/FreshAIServerServices.js";
import { generateFreshNativeDimensionalArtifact } from "../../src/core/fresh-ai/FreshNativeDimensionalEngines.js";
import "../../src/core/ara6/agents/defaultAgents.js";
export const config = { maxDuration: 60 };
type Body = { goal?: string; route?: string; approve?: boolean; conversationId?: string; conversation?: FreshConversationTurn[]; workspaceContext?: FreshAIWorkspaceContext; model?: string; voiceModel?: string; mode?: string; image?: { size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto"; quality?: "low" | "medium" | "high" | "auto" } };
type MemoryRow = {
  id: string;
  content: string;
  scope: FreshMemoryRecord["scope"];
  created_at: string;
  source: string;
};
const json = (x: unknown, status = 200) => Response.json(x, { status, headers: { "cache-control": "no-store" } });
const service = () => createFreshAIServerSupabase();

function requestsImage(goal: string, interpretation: FreshGoalInterpretation | null | undefined, mode?: string) {
  if (mode === "image" || mode === "image-generation") return true;
  if (interpretation?.intent === "create" && /\b(image|picture|photo|illustration|logo|poster|artwork|portrait|wallpaper|icon|visual|drawing|render|graphic)\b/i.test(goal)) return true;
  return /\b(generate|create|draw|render|make)\b[\s\S]{0,80}\b(image|picture|photo|illustration|logo|poster|artwork|portrait|wallpaper|icon|visual|drawing|graphic)\b/i.test(goal);
}
async function auth(req: Request) { const u = process.env.VITE_SUPABASE_URL, k = process.env.VITE_SUPABASE_ANON_KEY, a = req.headers.get("authorization") || "", t = a.startsWith("Bearer ") ? a.slice(7) : ""; if (!u || !k || !t) return null; const c = createClient(u, k, { auth: { persistSession: false, autoRefreshToken: false } }); const r = await c.auth.getUser(t); return r.data.user ?? null; }

async function handleMediaWorkerProxy(req: Request): Promise<Response> {
  const jsonProxy = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });
  try {
    const url = new URL(req.url);
    const suffix = url.searchParams.get("__fresh_media_worker_path") ?? "";
    const path = "/" + suffix.replace(/^\/+/, "");
    if (!(path === "/jobs" || /^\/jobs\/[0-9a-f-]{36}$/i.test(path) || /^\/jobs\/[0-9a-f-]{36}\/output$/i.test(path))) return jsonProxy({ error: "Media worker route not found." }, 404);
    if (!((req.method === "POST" && path === "/jobs") || (req.method === "GET" && path.startsWith("/jobs/")))) return jsonProxy({ error: "Method not allowed." }, 405);
    const authorization = req.headers.get("authorization") ?? "";
    const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const supabaseUrl = process.env.VITE_SUPABASE_URL, anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!bearer || !supabaseUrl || !anonKey) return jsonProxy({ error: "Authentication required." }, 401);
    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const authResult = await supabase.auth.getUser(bearer);
    if (!authResult.data.user) return jsonProxy({ error: "Authentication required." }, 401);
    const workerUrl = process.env.FRESH_MEDIA_WORKER_URL?.trim().replace(/\/$/, "");
    const workerToken = process.env.FRESH_MEDIA_WORKER_API_TOKEN?.trim();
    if (!workerUrl || !workerToken) return jsonProxy({ error: "Fresh media processing is not configured on the server." }, 503);
    const headers = new Headers({ authorization: "Bearer " + workerToken });
    let body: string | undefined;
    if (req.method === "POST") {
      if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) return jsonProxy({ error: "A JSON media job is required." }, 415);
      body = await req.text();
      if (body.length > 64 * 1024) return jsonProxy({ error: "Media job request is too large." }, 413);
      let parsed: unknown;
      try { parsed = JSON.parse(body); } catch { return jsonProxy({ error: "Invalid JSON media job." }, 400); }
      if (!parsed || typeof parsed !== "object" || typeof (parsed as { inputUrl?: unknown }).inputUrl !== "string") return jsonProxy({ error: "inputUrl is required." }, 400);
      headers.set("content-type", "application/json");
    }
    const upstream = await fetch(workerUrl + path, { method: req.method, headers, ...(body === undefined ? {} : { body }), cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(45_000) });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = await upstream.json().catch(() => ({})) as Record<string, unknown>;
      if (typeof payload.statusUrl === "string" && path === "/jobs" && payload.statusUrl.startsWith("/")) payload.statusUrl = "/api/media-worker" + payload.statusUrl;
      if (typeof payload.outputUrl === "string" && payload.outputUrl.startsWith("/jobs/")) payload.outputUrl = "/api/media-worker" + payload.outputUrl;
      return jsonProxy(payload, upstream.status);
    }
    const outHeaders = new Headers({ "cache-control": "no-store", "x-content-type-options": "nosniff" });
    if (contentType) outHeaders.set("content-type", contentType);
    const length = upstream.headers.get("content-length");
    if (length) outHeaders.set("content-length", length);
    return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
  } catch {
    return jsonProxy({ error: "Fresh media worker request failed. Please try again." }, 502);
  }
}

async function research(goal: string): Promise<Evidence[]> {
  const configured = process.env.FRESH_RESEARCH_URL?.trim();
  const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const endpoint = configured || `${origin}/api/research/search`;
  const mode = /\b(news|trending|latest|today|current|right now|worldwide|global|across the world)\b/i.test(goal) ? "live" : "global";
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 15_000);
  try {
    const r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, signal: ac.signal, body: JSON.stringify({ query: goal, mode, maxSources: 10 }) });
    if (!r.ok) return [];
    const p = await r.json() as { claims?: Array<{ id?: string; text?: string; confidence?: number; sourceUrls?: string[] }>; sources?: Array<{ title?: string; url?: string; snippet?: string; publishedAt?: string }>; runId?: string };
    const claims = (p.claims ?? []).filter(x => x.text);
    const sources = p.sources ?? [];
    const sourceByUrl = new Map(sources.filter(x => x.url).map(x => [x.url as string, x]));
    if (claims.length) return claims.map((claim, index) => {
      const sourceUrl = claim.sourceUrls?.[0] || sources[index]?.url || "fresh-research";
      const source = sourceByUrl.get(sourceUrl) || sources[index];
      return { id: claim.id || `research-${p.runId || "run"}-${index + 1}`, source: sourceUrl, claim: claim.text as string, observedAt: source?.publishedAt, confidence: typeof claim.confidence === "number" ? claim.confidence : .7 };
    });
    return sources.filter(x => x.url && (x.snippet || x.title)).map((source, index) => ({ id: `research-${p.runId || "run"}-${index + 1}`, source: source.url as string, claim: source.snippet || source.title as string, observedAt: source.publishedAt, confidence: .6 }));
  } catch { return []; } finally { clearTimeout(timer); }
}
function memory(userId: string | null) { const c = service(); return { search: async (q: string, scope?: FreshMemoryRecord["scope"]): Promise<FreshMemoryRecord[]> => { if (!c || !userId) return []; let query = c.from("fresh_ai_memory").select("id,content,scope,created_at,source").eq("user_id", userId).order("updated_at", { ascending: false }).limit(32); if (scope) query = query.eq("scope", scope); const r = await query, words = q.toLowerCase().split(/\s+/).filter(x => x.length > 3); return (r.data ?? []).filter((x: MemoryRow) => !words.length || words.some(w => x.content.toLowerCase().includes(w))).slice(0, 8).map((x: MemoryRow) => ({ id: x.id, content: x.content, scope: x.scope, createdAt: x.created_at, source: x.source })) as FreshMemoryRecord[]; }, remember: async (x: FreshMemoryRecord) => { if (!c || !userId) return; const r = await c.from("fresh_ai_memory").upsert({ id: x.id, user_id: userId, scope: x.scope, content: x.content, source: x.source, created_at: x.createdAt, updated_at: new Date().toISOString() }); if (r.error) throw new Error(`Fresh AI memory persistence failed: ${r.error.message}`); } }; }
// Fresh AI is provider-independent: this endpoint calls no outside AI model.
// modelId: the canonical model boundary lives in the Fresh gateway (fresh-unified-1).
const FRESH_KB_STOP = new Set(["fresh","what","does","about","that","this","have","your","from","tell","show","explain","please","there","their","which","would","could","should","when","where","into","than","then","them","they","been","being","also","just","like","make","made","more","most","some","such","only","over","very","will","with","lite","web","work","works"]);
async function platformKnowledge(goal: string): Promise<Awaited<ReturnType<typeof research>>> {
  const c = service();
  if (!c) return [];
  const words = Array.from(new Set(goal.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, "")).filter((w) => w.length > 3 && !FRESH_KB_STOP.has(w)))).slice(0, 10);
  if (!words.length) return [];
  const r = await c.from("fresh_ai_knowledge").select("id,title,content,source,confidence").is("user_id", null).eq("project_id", "fresh-web-lite-platform").limit(200);
  if (r.error || !r.data) return [];
  return (r.data as Array<{ id: string; title: string; content: string; source: string | null; confidence: number | null }>)
    .map((x) => {
      const title = x.title.toLowerCase(), content = x.content.toLowerCase();
      return { x, score: words.reduce((n, w) => n + (title.includes(w) ? 2 : 0) + (content.includes(w) ? 1 : 0), 0) };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ x }) => ({
      id: `kb-${x.id}`,
      source: x.source || "fresh-platform-knowledge",
      claim: `${x.title}: ${x.content}`.slice(0, 900),
      confidence: Number.isFinite(Number(x.confidence)) ? Number(x.confidence) : 0.9,
    })) as Awaited<ReturnType<typeof research>>;
}

async function persistPipeline(requestId: string, userId: string | null, pipeline: any[]) { const c = service(); if (!pipeline.length) return { configured: false, inserted: 0, error: "No pipeline events were produced" }; if (!c) { const status = getFreshAIPersistenceStatus(); return { configured: false, inserted: 0, error: status.reason || "Fresh AI server persistence is not configured", environment: status.environment }; } const rows = pipeline.map(x => ({ request_id: requestId, user_id: userId, stage: x.stage, status: x.status, started_at: x.startedAt, completed_at: x.completedAt ?? null, detail: x.detail ?? null, metrics: x.metrics ?? {} })); const r = await c.from("fresh_ai_pipeline_events").insert(rows); if (r.error) return { configured: true, inserted: 0, error: r.error.message }; return { configured: true, inserted: rows.length }; }
async function loadConversation(userId: string | null, conversationId?: string) { const c = service(); if (!c || !userId || !conversationId) return { id: null as string | null, turns: [] as FreshConversationTurn[] }; const owner = await c.from("fresh_ai_conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle(); if (!owner.data) return { id: null as string | null, turns: [] as FreshConversationTurn[] }; const r = await c.from("fresh_ai_conversation_turns").select("role,content,created_at").eq("conversation_id", conversationId).eq("user_id", userId).in("role", ["user", "assistant"]).order("created_at", { ascending: true }).limit(40); return { id: conversationId, turns: (r.data ?? []).filter((x: any) => typeof x.content === "string" && !x.content.startsWith("fresh-e2ee-v1:")).map((x: any) => ({ role: x.role, content: x.content, createdAt: x.created_at })) as FreshConversationTurn[] }; }
async function conversationLedger(userId: string | null, conversationId: string | undefined, route: string, workspace: FreshAIWorkspaceContext, model: string, goal: string, requestId: string, evidence: Evidence[], answer: string) {
  const c = service();
  if (!c || !userId) return conversationId ?? null;
  let id = conversationId;
  if (id) {
    const check = await c.from("fresh_ai_conversations").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!check.data) id = undefined;
  }
  if (!id) {
    const created = await c.from("fresh_ai_conversations").insert({
      user_id: userId, title: "Encrypted Fresh AI conversation", route, surface: workspace.surface, model_id: model,
      metadata: { e2ee: "fresh-e2ee-v1", titleSealed: true },
    }).select("id").single();
    if (created.error || !created.data) return null;
    id = created.data.id;
  }
  const pending = (requestId: string) => `fresh-e2ee-v1:pending:${requestId}`;
  const rows = [
    { conversation_id: id, user_id: userId, request_id: requestId, role: "user", content: pending(requestId), model_id: model, evidence: [], metadata: { e2ee: "fresh-e2ee-v1", state: "pending-seal" } },
    ...(answer ? [{ conversation_id: id, user_id: userId, request_id: requestId, role: "assistant", content: pending(requestId), model_id: model, evidence: [], metadata: { e2ee: "fresh-e2ee-v1", state: "pending-seal" } }] : []),
  ];
  const inserted = await c.from("fresh_ai_conversation_turns").insert(rows);
  if (inserted.error) return null;
  await c.from("fresh_ai_conversations").update({ route, surface: workspace.surface, model_id: model, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  return id;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.has("__fresh_ai_status")) return handleFreshAIStatus();
  if (url.searchParams.has("__fresh_media_worker_path")) return handleMediaWorkerProxy(req);
  return json({ error: "Method not allowed." }, 405);
}

export async function POST(req: Request): Promise<Response> {
  if (new URL(req.url).searchParams.has("__fresh_media_worker_path")) return handleMediaWorkerProxy(req);
  const requestId = crypto.randomUUID();
  try {
    const b = await req.json() as Body;
    const goal = typeof b.goal === "string" ? b.goal.trim() : "";
    const route = typeof b.route === "string" ? b.route.trim().slice(0, 120) : "/";
    const workspaceContext = b.workspaceContext && typeof b.workspaceContext === "object" ? b.workspaceContext : createFreshAIWorkspaceContext(route);
    const model = typeof b.model === "string" ? b.model : "fresh-auto";
    if (!goal) return json({ error: "A goal is required" }, 400);
    if (goal.length > 4000) return json({ error: "Keep the request under 4,000 characters" }, 400);

    const nativeArtifact = generateFreshNativeDimensionalArtifact(goal);
    if (nativeArtifact) {
      return json({
        requestId,
        answer: `Fresh AI generated this using its native ${nativeArtifact.dimension}D engine. No external AI model API was required.`,
        intent: "create",
        status: "completed",
        model: "fresh-native-dimensional",
        provider: "fresh-native",
        native: true,
        dimensionalArtifact: nativeArtifact,
        workspace: workspaceContext,
      });
    }

    const user = await auth(req);
    const uid = user?.id ?? null;
    const stored = await loadConversation(uid, b.conversationId);
    const clientTurns = Array.isArray(b.conversation)
      ? b.conversation.filter((x) => x && typeof x.content === "string" && (x.role === "user" || x.role === "assistant")).slice(-12)
      : [];
    const conversation = [...stored.turns, ...clientTurns].slice(-12);

    const gw = createFreshAIIntelligenceGateway({
      skills: createCoreFreshSkillRegistry(),
      memory: memory(uid),
      retrieve: async (x, i) => { const [web, kb] = await Promise.all([i.needsEvidence || i.intent === "research" ? research(x) : Promise.resolve([] as Awaited<ReturnType<typeof research>>), platformKnowledge(x)]); return [...kb, ...web]; },
    });
    const r: FreshAIResponse = await gw.handle({
      requestId,
      input: goal,
      route,
      userId: uid,
      conversation,
      context: { workspace: workspaceContext, model, voiceModel: b.voiceModel ?? null },
      approve: Boolean(b.approve),
      execute: true,
    });

    let generatedImage: { dataUrl?: string; b64?: string; model: string; size: string } | null = null;
    if (requestsImage(goal, r.interpretation, b.mode)) {
      try {
        const image = await generateFreshAIImage(goal, { size: b.image?.size, quality: b.image?.quality });
        generatedImage = { dataUrl: `data:image/${image.outputFormat};base64,${image.b64Json}`, b64: image.b64Json, model: image.model, size: image.size };
        r.result.answer = r.result.answer || "Fresh AI generated the image requested.";
      } catch (error) {
        return json({ requestId, error: error instanceof Error ? error.message : "Image generation failed", status: "failed", intent: r.interpretation.intent }, 503);
      }
    }

    const evidence = (r.result.claims ?? []).flatMap((x: any) => Array.isArray(x.evidence) ? x.evidence : []) as Evidence[];
    const conversationId = await conversationLedger(uid, b.conversationId, route, workspaceContext, model, goal, requestId, evidence, r.result.answer || "");
    let image: { dataUrl?: string; url?: string; assetId?: string; model: string; size: string } | null = null;
    if (generatedImage) {
      if (uid && generatedImage.b64 && conversationId) {
        try {
          const asset = await persistFreshAIMedia({
            userId: uid,
            requestId,
            conversationId,
            kind: "image",
            b64: generatedImage.b64,
            mimeType: "image/png",
            modelId: generatedImage.model,
            prompt: goal,
            metadata: { size: generatedImage.size },
          });
          image = { url: asset.signedUrl, assetId: asset.id, model: generatedImage.model, size: generatedImage.size };
        } catch {
          image = { dataUrl: generatedImage.dataUrl, model: generatedImage.model, size: generatedImage.size };
        }
      } else {
        image = { dataUrl: generatedImage.dataUrl, model: generatedImage.model, size: generatedImage.size };
      }
    }

 const persistence = await persistPipeline(requestId, uid, r.pipeline), e = evidence.map(x => ({ title: x.source, snippet: x.claim })), verification = { uniqueSources: e.length, uniqueDomains: new Set(evidence.map(x => x.source || "unknown")).size, sourceDiversity: e.length >= 6 ? "high" : e.length >= 3 ? "medium" : "low", confidence: e.length >= 3 ? "medium" : "low", contradictionsDetected: (r.result.claims ?? []).some((x: any) => x.truth === "CONTRADICTED") }, governance = { autonomousSelfModification: false, improvementProposalsRequireApproval: true, highImpactActionsRequireApproval: true, reversibleImprovementsOnly: true };
 return json({ requestId, conversationId, answer: r.result.answer, confidence: verification.confidence, source: e.length ? "Fresh AI / verified evidence" : "Fresh AI", evidence: e, pipeline: r.pipeline, governance, verification, persistence, image, proof: { mode: "gateway", evidenceCount: e.length, provenance: "Fresh AI Intelligence Gateway → Kernel → Truth/Reasoning → Verification", model }, intent: r.interpretation.intent, status: r.status, error: r.error, workspace: workspaceContext ?? null, model });
 } catch (error) { return json({ requestId, error: error instanceof Error ? error.message : "Fresh AI request failed" }, 500); } }

export default createVercelNodeHandler({ GET, POST });
