import { createClient } from "@supabase/supabase-js";
import { createFreshAIIntelligenceGateway, type FreshAIResponse } from "../../src/core/fresh-ai/FreshAIIntelligenceGateway.js";
import { createCoreFreshSkillRegistry } from "../../src/core/fresh-ai/FreshAISkillFabric.js";
import type { Evidence, FreshConversationTurn } from "../../src/core/fresh-ai/FreshAIArchitecture.js";
import type { FreshMemoryRecord } from "../../src/core/fresh-ai/FreshAIKernel.js";
import { createFreshAIWorkspaceContext, type FreshAIWorkspaceContext } from "../../src/core/fresh-ai/FreshAIWorkspaceContext.js";
import { createFreshAIServerSupabase, getFreshAIPersistenceStatus } from "../../src/core/fresh-ai/FreshAIServerServices.js";
import "../../src/core/ara6/agents/defaultAgents.js";

export const config = { maxDuration: 60 };

type Body = {
  goal?: string;
  route?: string;
  approve?: boolean;
  conversationId?: string;
  conversation?: FreshConversationTurn[];
  workspaceContext?: FreshAIWorkspaceContext;
  model?: string;
  voiceModel?: string;
};

type MemoryRow = { id: string; content: string; scope: FreshMemoryRecord["scope"]; created_at: string; source: string };

type SupabaseUser = { id: string };

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });
const server = () => createFreshAIServerSupabase();

async function authenticate(req: Request): Promise<SupabaseUser | null> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.getUser(token);
  return result.data.user ? { id: result.data.user.id } : null;
}

function memoryStore(userId: string | null) {
  const client = server();
  return {
    search: async (query: string, scope?: FreshMemoryRecord["scope"]): Promise<FreshMemoryRecord[]> => {
      if (!client || !userId) return [];
      let request = client.from("fresh_ai_memory").select("id,content,scope,created_at,source").eq("user_id", userId).order("updated_at", { ascending: false }).limit(32);
      if (scope) request = request.eq("scope", scope);
      const result = await request;
      if (result.error) return [];
      const words = query.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
      return (result.data ?? []).filter((row: MemoryRow) => !words.length || words.some((word) => row.content.toLowerCase().includes(word))).slice(0, 8).map((row: MemoryRow) => ({ id: row.id, content: row.content, scope: row.scope, createdAt: row.created_at, source: row.source }));
    },
    remember: async (record: FreshMemoryRecord): Promise<void> => {
      if (!client || !userId) return;
      const result = await client.from("fresh_ai_memory").upsert({ id: record.id, user_id: userId, scope: record.scope, content: record.content, source: record.source, created_at: record.createdAt, updated_at: new Date().toISOString() });
      if (result.error) throw new Error(`Fresh AI memory persistence failed: ${result.error.message}`);
    },
  };
}

async function researchEvidence(goal: string): Promise<Evidence[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: key, query: goal, search_depth: "advanced", topic: "general", max_results: 8, include_answer: false, include_raw_content: false }),
    });
    if (!response.ok) return [];
    const payload = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }> };
    return (payload.results ?? []).filter((item) => item.title && item.url).map((item, index) => ({ id: `web-${index + 1}`, source: item.url!, claim: item.content || item.title!, observedAt: item.published_date, confidence: 0.7 }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function loadConversation(userId: string | null, conversationId?: string): Promise<{ id: string | null; turns: FreshConversationTurn[] }> {
  const client = server();
  if (!client || !userId || !conversationId) return { id: null, turns: [] };
  const owner = await client.from("fresh_ai_conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
  if (!owner.data) return { id: null, turns: [] };
  const result = await client.from("fresh_ai_conversation_turns").select("role,content,created_at").eq("conversation_id", conversationId).eq("user_id", userId).in("role", ["user", "assistant"]).order("created_at", { ascending: true }).limit(40);
  return { id: conversationId, turns: (result.data ?? []).map((row) => ({ role: row.role as "user" | "assistant", content: String(row.content), createdAt: String(row.created_at) })) };
}

async function persistConversation(userId: string | null, conversationId: string | undefined, workspace: FreshAIWorkspaceContext, modelId: string, goal: string, requestId: string, response: FreshAIResponse) {
  const client = server();
  if (!client || !userId || !response.result.answer) return conversationId ?? null;
  let id = conversationId;
  if (id) {
    const owner = await client.from("fresh_ai_conversations").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!owner.data) id = undefined;
  }
  if (!id) {
    const created = await client.from("fresh_ai_conversations").insert({ user_id: userId, title: goal.slice(0, 100), route: workspace.route, surface: workspace.surface, model_id: modelId }).select("id").single();
    if (created.error || !created.data) return null;
    id = created.data.id;
  }
  const evidence = response.result.claims.map((claim) => ({ statement: claim.statement, truth: claim.truth, confidence: claim.confidence }));
  const rows = [
    { conversation_id: id, user_id: userId, request_id: requestId, role: "user", content: goal, model_id: modelId },
    { conversation_id: id, user_id: userId, request_id: requestId, role: "assistant", content: response.result.answer, model_id: modelId, evidence },
  ];
  const inserted = await client.from("fresh_ai_conversation_turns").insert(rows);
  if (inserted.error) return null;
  await client.from("fresh_ai_conversations").update({ route: workspace.route, surface: workspace.surface, model_id: modelId, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  return id;
}

async function persistPipeline(userId: string | null, requestId: string, events: FreshAIResponse["pipeline"]) {
  const client = server();
  if (!events.length) return;
  if (!client) return;
  const rows = events.map((event) => ({ request_id: requestId, user_id: userId, stage: event.stage, status: event.status, started_at: event.startedAt, completed_at: event.completedAt ?? null, detail: event.detail ?? null, metrics: event.metrics ?? {} }));
  await client.from("fresh_ai_pipeline_events").insert(rows);
}

export async function POST(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const body = await req.json() as Body;
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const route = typeof body.route === "string" ? body.route.trim().slice(0, 120) : "/";
    if (!goal) return json({ error: "A goal is required" }, 400);
    if (goal.length > 4000) return json({ error: "Keep the request under 4,000 characters" }, 400);

    const workspace = body.workspaceContext && typeof body.workspaceContext === "object" ? body.workspaceContext : createFreshAIWorkspaceContext(route);
    const user = await authenticate(req);
    const stored = await loadConversation(user?.id ?? null, body.conversationId);
    const clientTurns = Array.isArray(body.conversation) ? body.conversation.filter((turn) => turn && typeof turn.content === "string" && (turn.role === "user" || turn.role === "assistant")).slice(-12) : [];
    const conversation = [...stored.turns, ...clientTurns].slice(-12);
    const interpretation = undefined;
    const evidence = body.model === "research" || body.model === "fresh-research" || /\b(research|sources?|evidence|verify|fact.?check)\b/i.test(goal) ? await researchEvidence(goal) : [];
    const gateway = createFreshAIIntelligenceGateway({
      skills: createCoreFreshSkillRegistry(),
      memory: memoryStore(user?.id ?? null),
      retrieve: async () => evidence,
    });
    const response = await gateway.handle({
      requestId,
      input: goal,
      route,
      userId: user?.id ?? null,
      conversation,
      evidence,
      context: { workspace, model: body.model ?? "fresh-unified-1", voiceModel: body.voiceModel ?? null },
      approve: Boolean(body.approve),
      execute: true,
      intent: interpretation,
    });
    const modelId = response.universal?.modelId ?? "fresh-unified-1";
    const conversationId = await persistConversation(user?.id ?? null, body.conversationId, workspace, modelId, goal, requestId, response);
    await persistPipeline(user?.id ?? null, requestId, response.pipeline);
    return json({
      requestId,
      conversationId,
      answer: response.result.answer,
      status: response.status,
      error: response.error,
      source: "Fresh Native Intelligence",
      native: true,
      model: modelId,
      evidence: evidence.map((item) => ({ title: item.source, snippet: item.claim })),
      universal: response.universal,
      persistence: user ? getFreshAIPersistenceStatus() : { configured: false, reason: "Authentication not provided" },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Fresh AI native gateway failed", requestId }, 500);
  }
}
