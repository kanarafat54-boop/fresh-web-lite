import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 30 };

type RequestBody = { goal?: string; route?: string };
type Evidence = { title: string; url: string; snippet?: string; publishedAt?: string; provider: string; kind?: "web" | "news" | "video" | "image"; domain?: string };
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
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|tiktok\.com)$/.test(host)) return "video";
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
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
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

async function providerAnswer(goal: string, route: string, evidence: Evidence[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const model = process.env.FRESH_AI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const evidenceText = evidence.length ? `\n\nFresh Search evidence (cite only these URLs when making factual claims):\n${evidence.map((item, index) => `[${index + 1}] ${item.title} — ${item.url}${item.snippet ? `\n${item.snippet.slice(0, 500)}` : ""}`).join("\n\n")}` : "\n\nNo live web evidence was available. Be explicit about uncertainty and do not invent citations.";
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: "You are Fresh AI inside Fresh Web Lite. Give useful, concise answers. For factual or current claims, prioritize the supplied Fresh Search evidence, distinguish evidence from inference, and never fabricate a source or claim verification that did not occur." }] }, contents: [{ role: "user", parts: [{ text: `Current Fresh workspace: ${route}\nUser request: ${goal}${evidenceText}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 900 } }) });
  if (!response.ok) return null;
  const payload = await response.json() as GeminiResponse;
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || null;
}

function nativeAnswer(goal: string, route: string): string {
  const normalized = goal.toLowerCase();
  if (normalized.includes("what can you do") || normalized.includes("help")) return `Fresh AI is active in ${route}. I can help you understand this workspace, plan a task, summarize information you provide, and guide you to the next Fresh feature.`;
  if (normalized.includes("where") || normalized.includes("find")) return `You are currently in ${route}. Use Fresh Search for platform-wide discovery, or open the relevant workspace from the navigation.`;
  if (normalized.includes("plan") || normalized.includes("next")) return `A good next step from ${route} is to define the outcome, identify the smallest useful action, then verify the result. Tell me the outcome you want and I will turn it into a concrete plan.`;
  return `Fresh AI received your request in ${route}. The native Fresh intelligence boundary is working. No external language-model provider is configured for this deployment, so I will not invent an answer or pretend it has been verified.`;
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
    const answer = await providerAnswer(goal, route, evidence.sources).catch(() => null);
    return json({ answer: answer ?? nativeAnswer(goal, route), confidence: answer ? (evidence.verification?.confidence ?? "unknown") : "known", source: answer ? "Fresh AI grounded by Fresh Search" : "Fresh native intelligence boundary", authenticated: Boolean(user), evidence: evidence.sources, verification: evidence.verification ?? null });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Fresh AI request failed" }, 500); }
}
