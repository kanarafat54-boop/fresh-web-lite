import { createClient } from "@supabase/supabase-js";
import { reasonAcrossDimensions } from "../../src/core/fresh-ai/dimensionalIntelligence.js";

export const config = { maxDuration: 30 };

type RequestBody = { goal?: string; route?: string };
type Evidence = { title: string; url: string; snippet?: string; publishedAt?: string; provider: string; kind?: "web" | "news" | "video" | "image" | "music"; domain?: string };
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
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.toLowerCase();
    if (/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|tiktok\.com)$/.test(host)) return "video";
    if (/(spotify\.com|music\.apple\.com|soundcloud\.com|bandcamp\.com|deezer\.com|tidal\.com)$/.test(host)) return "music";
    if (/\.(png|jpe?g|gif|webp|avif|svg)(?:$|\?)/.test(path)) return "image";
  } catch { /* fallback */ }
  return publishedAt ? "news" : "web";
}

async function fetchEvidence(goal: string): Promise<{ sources: Evidence[]; verification?: { uniqueSources: number; uniqueDomains: number; sourceDiversity: string; confidence: string; contradictionsDetected?: boolean } }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { sources: [] };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ api_key: apiKey, query: goal, search_depth: "advanced", topic: "general", max_results: 8, include_answer: false, include_raw_content: false }),
    });
    if (!response.ok) return { sources: [] };
    const payload = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }> };
    const sources = (payload.results ?? []).filter((item) => item.title && item.url).map((item) => {
      const url = item.url as string;
      return { title: item.title as string, url, snippet: item.content, publishedAt: item.published_date, provider: "Tavily", kind: kindOf(url, item.published_date), domain: domainOf(url) };
    });
    const domains = new Set(sources.map((source) => source.domain));
    return { sources, verification: { uniqueSources: sources.length, uniqueDomains: domains.size, sourceDiversity: domains.size >= 6 ? "high" : domains.size >= 3 ? "medium" : "low", confidence: sources.length >= 6 && domains.size >= 4 ? "high" : sources.length >= 3 ? "medium" : "low" } };
  } catch { return { sources: [] }; } finally { clearTimeout(timeout); }
}

async function providerAnswer(goal: string, route: string, evidence: Evidence[], dimensionalContext: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const model = process.env.FRESH_AI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const evidenceText = evidence.length ? `\n\nFresh Search evidence was retrieved from the public web. Use it as factual grounding. Do not expose raw URLs or source-directory links. Distinguish verified evidence from inference.\n${evidence.map((item, index) => `[Evidence ${index + 1}] ${item.title}${item.publishedAt ? ` · ${item.publishedAt}` : ""}\n${item.snippet ? item.snippet.slice(0, 700) : ""}`).join("\n\n")}` : "\n\nNo live web evidence was available. Be explicit about uncertainty and do not claim verification.";
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: "You are Fresh AI inside Fresh Web Lite. Research-grounded answers are the default. Use supplied evidence, synthesize independent results, separate evidence from inference, acknowledge conflicts, and never fabricate proof. Never print raw URLs, citations, or a source directory; Fresh renders provenance as its own internal Proof and Evidence layer." }] }, contents: [{ role: "user", parts: [{ text: `Current Fresh workspace: ${route}\nUser request: ${goal}\nDimensional reasoning context: ${dimensionalContext}${evidenceText}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 900 } }) });
  if (!response.ok) return null;
  const payload = await response.json() as GeminiResponse;
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || null;
}

function nativeAnswer(goal: string, route: string, dimensions: number): string {
  const normalized = goal.toLowerCase();
  if (normalized.includes("what can you do") || normalized.includes("help")) return `Fresh AI is active in ${route}. I can understand, research, reason, plan, analyze, and guide actions through Fresh intelligence using ${dimensions} reasoning dimensions.`;
  if (normalized.includes("where") || normalized.includes("find")) return `You are currently in ${route}. Fresh Search can research the public web and organize what it finds inside Fresh.`;
  if (normalized.includes("plan") || normalized.includes("next")) return `A good next step from ${route} is to define the outcome, identify the smallest useful action, then verify the result through Fresh Intelligence.`;
  return `Fresh AI analyzed your request in ${route} using native reasoning. Live research evidence was not available, so I will not pretend an unverified answer is proven.`;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json() as RequestBody;
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const route = typeof body.route === "string" && body.route.trim() ? body.route.trim().slice(0, 120) : "/";
    if (!goal) return json({ error: "A goal is required" }, 400);
    if (goal.length > 4000) return json({ error: "Keep the request under 4,000 characters" }, 400);
    const user = await authenticatedUser(req);
    const evidence = await fetchEvidence(goal);
    const dimensions = reasonAcrossDimensions(goal);
    const dimensionalContext = dimensions.map((item) => `${item.dimension}D:${item.lens.focus}; confidence=${item.confidence.toFixed(2)}`).join(" | ");
    const answer = await providerAnswer(goal, route, evidence.sources, dimensionalContext).catch(() => null);
    const publicEvidence: PublicEvidence[] = evidence.sources.slice(0, 8).map(({ title, snippet, publishedAt, kind }) => ({ title, snippet, publishedAt, kind }));
    return json({ answer: answer ?? nativeAnswer(goal, route, dimensions.length), confidence: answer ? (evidence.verification?.confidence ?? "unknown") : "known", source: answer ? "Fresh Intelligence" : "Fresh native intelligence boundary", authenticated: Boolean(user), evidence: publicEvidence, verification: evidence.verification ?? null, proof: { mode: answer ? "research-grounded" : "native", evidenceCount: publicEvidence.length, provenance: "internal", dimensionalReasoning: { enabled: true, dimensions: dimensions.length } });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Fresh AI request failed" }, 500); }
}
