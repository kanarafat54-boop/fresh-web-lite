import { createClient } from "@supabase/supabase-js";
import { FreshAIKernel } from "../../src/core/fresh-ai/FreshAIKernel.js";
import { createCoreFreshSkillRegistry } from "../../src/core/fresh-ai/FreshAISkillFabric.js";
import { reasonAcrossDimensions } from "../../src/core/fresh-ai/dimensionalIntelligence.js";
import "../../src/core/ara6/agents/defaultAgents.js";

export const config = { maxDuration: 30 };

type RequestBody = { goal?: string; route?: string; approve?: boolean };
type Evidence = { id: string; title: string; url: string; snippet?: string; publishedAt?: string; provider: string; kind?: "web" | "news" | "video" | "image" | "music"; domain?: string };
type PublicEvidence = { title: string; snippet?: string; publishedAt?: string; kind?: Evidence["kind"] };
type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

function json(data: unknown, status = 200): Response { return Response.json(data, { status, headers: { "cache-control": "no-store" } }); }

async function authenticatedUser(req: Request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await client.auth.getUser(token);
  return data.user ?? null;
}

function domainOf(url: string): string { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown"; } }
function kindOf(url: string, publishedAt?: string): Evidence["kind"] {
  try {
    const parsed = new URL(url); const host = parsed.hostname.toLowerCase().replace(/^www\./, ""); const path = parsed.pathname.toLowerCase();
    if (/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|tiktok\.com)$/.test(host)) return "video";
    if (/(spotify\.com|music\.apple\.com|soundcloud\.com|bandcamp\.com|deezer\.com|tidal\.com)$/.test(host)) return "music";
    if (/\.(png|jpe?g|gif|webp|avif|svg)(?:$|\?)/.test(path)) return "image";
  } catch { /* fallback */ }
  return publishedAt ? "news" : "web";
}

async function fetchEvidence(goal: string): Promise<{ sources: Evidence[]; verification?: { uniqueSources: number; uniqueDomains: number; sourceDiversity: string; confidence: string; contradictionsDetected?: boolean } }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { sources: [] };
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal, body: JSON.stringify({ api_key: apiKey, query: goal, search_depth: "advanced", topic: "general", max_results: 8, include_answer: false, include_raw_content: false }) });
    if (!response.ok) return { sources: [] };
    const payload = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }> };
    const sources = (payload.results ?? []).filter((item) => item.title && item.url).map((item, index) => { const url = item.url as string; return { id: `web-${index + 1}`, title: item.title as string, url, snippet: item.content, publishedAt: item.published_date, provider: "Tavily", kind: kindOf(url, item.published_date), domain: domainOf(url) }; });
    const domains = new Set(sources.map((source) => source.domain));
    return { sources, verification: { uniqueSources: sources.length, uniqueDomains: domains.size, sourceDiversity: domains.size >= 6 ? "high" : domains.size >= 3 ? "medium" : "low", confidence: sources.length >= 6 && domains.size >= 4 ? "high" : sources.length >= 3 ? "medium" : "low" } };
  } catch { return { sources: [] }; } finally { clearTimeout(timeout); }
}

async function providerAnswer(goal: string, route: string, intent: string, evidence: Evidence[], dimensionalContext: string, plan: string, executions: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const model = process.env.FRESH_AI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const evidenceText = evidence.length ? "\n\nEvidence retrieved by Fresh Search. Use it for grounding; do not expose raw URLs or source-directory links.\n" + evidence.map((item, index) => `[Evidence ${index + 1}] ${item.title}${item.publishedAt ? ` · ${item.publishedAt}` : ""}\n${(item.snippet ?? "").slice(0, 700)}`).join("\n\n") : "\n\nNo live web evidence was available. Do not claim current verification.";
  const executionText = executions ? `\n\nARA6 execution results:\n${executions}` : "";
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: "You are Fresh AI, the universal intelligence and action layer inside Fresh Web Lite. Understand the user's actual goal, including vague, conversational, implicit and multi-step requests. Decide what the user needs and fulfill it directly when the available Fresh capabilities allow it. You coordinate reasoning, research, memory, planning, verification and ARA6 execution. Never claim an external action happened unless it actually happened. Use evidence when supplied, distinguish fact from inference, preserve uncertainty and conflicts, and never expose raw URLs, citations, domains or a source directory; Fresh presents provenance through its Proof and Evidence layer." }] }, contents: [{ role: "user", parts: [{ text: `Workspace: ${route}\nInterpreted intent: ${intent}\nUser request: ${goal}\nReasoning context: ${dimensionalContext}\nPlanned capability path: ${plan}${executionText}${evidenceText}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1400 } }) });
  if (!response.ok) return null;
  const payload = await response.json() as GeminiResponse;
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || null;
}

function nativeAnswer(goal: string, route: string, intent: string, dimensions: number, executions: Array<{ accepted: boolean; status: string; detail: string }>): string {
  const normalized = goal.toLowerCase();
  if (normalized.includes("what can you do") || normalized.includes("help")) return `Fresh AI is active in ${route}. I understand requests as goals, choose the required capabilities, reason across ${dimensions} dimensions, and coordinate research, creation, coding, planning, learning and permitted actions.`;
  if (normalized.includes("where") || normalized.includes("find")) return `I understand this as a ${intent} request. Fresh AI routed it through the intelligence and execution fabric${executions.some((item) => item.accepted) ? " and completed the available capability step" : ""}.`;
  return `I understand this as a ${intent} request: ${goal}. Fresh AI selected the required capability path and preserved anything that needs evidence, approval or an unavailable tool.`;
}

const memoryStore = { search: async () => [], remember: async () => undefined };

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json() as RequestBody;
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const route = typeof body.route === "string" && body.route.trim() ? body.route.trim().slice(0, 120) : "/";
    if (!goal) return json({ error: "A goal is required" }, 400);
    if (goal.length > 4000) return json({ error: "Keep the request under 4,000 characters" }, 400);
    const user = await authenticatedUser(req);
    const evidence = await fetchEvidence(goal);
    const nativeEvidence = evidence.sources.map((item) => ({ id: item.id, source: item.provider, claim: item.snippet || item.title, observedAt: item.publishedAt, confidence: 0.7 }));
    const kernel = new FreshAIKernel(createCoreFreshSkillRegistry(), memoryStore);
    const understood = await kernel.understand({ input: goal, context: { route, userId: user?.id ?? null } });
    const retrieved = await kernel.retrieve({ input: goal, evidence: nativeEvidence });
    const reasoning = await kernel.reason({ input: goal, intent: understood.intent, context: understood.context, evidence: retrieved });
    const planned = await kernel.plan({ input: goal, intent: understood.intent, context: understood.context, evidence: retrieved }, reasoning);
    const verified = await kernel.verify({ ...reasoning, plan: planned });
    const shouldExecute = understood.intent === "research" || understood.intent === "discover" || understood.intent === "learn" || understood.intent === "act";
    const executions = shouldExecute ? await kernel.execute(planned, {
      approve: Boolean(body.approve),
      requestId: crypto.randomUUID(),
      origin: new URL(req.url).origin,
      userId: user?.id ?? null,
    }) : [];

    const dimensions = reasonAcrossDimensions(goal, undefined);
    const dimensionalContext = dimensions.map((item) => `${item.dimension}D:${item.lens.focus}; confidence=${item.confidence.toFixed(2)}`).join(" | ");
    const planText = planned.map((step) => `${step.agent ?? "native"}:${step.skills.join(",")}`).join(" → ");
    const executionText = executions.map((item) => `${item.agent ?? "native"}:${item.status}:${item.detail}`).join("\n");
    const answer = await providerAnswer(goal, route, understood.intent, evidence.sources, dimensionalContext, planText, executionText).catch(() => null);
    const publicEvidence: PublicEvidence[] = evidence.sources.slice(0, 8).map(({ title, snippet, publishedAt, kind }) => ({ title, snippet, publishedAt, kind }));

    return json({
      answer: answer ?? nativeAnswer(goal, route, understood.intent, dimensions.length, executions),
      confidence: answer ? (evidence.verification?.confidence ?? "unknown") : "unknown",
      source: "Fresh Intelligence",
      authenticated: Boolean(user),
      intent: understood.intent,
      plan: planned.map((step) => ({ id: step.id, agent: step.agent ?? null, skills: step.skills, requiresApproval: Boolean(step.requiresApproval) })),
      execution: executions,
      evidence: publicEvidence,
      verification: { ...(evidence.verification ?? {}), unknowns: verified.unknowns },
      proof: { mode: evidence.sources.length ? "research-grounded" : "native", evidenceCount: publicEvidence.length, provenance: "internal", dimensionalReasoning: { enabled: true, dimensions: dimensions.length } },
    });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Fresh AI request failed" }, 500); }
}
