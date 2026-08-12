import { synthesizeResearch, type ResearchPass } from "./orchestrator";
import { persistSemanticResearch } from "./persistSemanticResearch";

type ResearchMode = "quick" | "deep" | "global" | "live" | "academic" | "business" | "people" | "local";
type SearchRequest = { query?: string; maxSources?: number; context?: string[]; mode?: ResearchMode };
type TavilyResult = { title?: string; url?: string; content?: string; published_date?: string };

export const config = { maxDuration: 60 };

const MODE_CONFIG: Record<ResearchMode, { searchDepth: "basic" | "advanced"; topic: "general" | "news"; prefix?: string }> = {
  quick: { searchDepth: "basic", topic: "general" },
  deep: { searchDepth: "advanced", topic: "general" },
  global: { searchDepth: "advanced", topic: "general", prefix: "Search broadly across the global public web. Prefer diverse, authoritative sources from multiple regions and languages where relevant." },
  live: { searchDepth: "advanced", topic: "news", prefix: "Prioritize current and recently published information." },
  academic: { searchDepth: "advanced", topic: "general", prefix: "Prioritize academic, scientific, technical, institutional, and primary sources." },
  business: { searchDepth: "advanced", topic: "general", prefix: "Prioritize company, market, regulatory, financial, and primary business sources." },
  people: { searchDepth: "advanced", topic: "general", prefix: "Use public, relevant information only. Do not seek private or sensitive personal information." },
  local: { searchDepth: "advanced", topic: "general", prefix: "Prioritize geographically relevant and local sources when the query contains a location." },
};

async function runTavily(apiKey: string, query: string, config: (typeof MODE_CONFIG)[ResearchMode], maxResults: number): Promise<ResearchPass> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const upstream = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ api_key: apiKey, query, search_depth: config.searchDepth, topic: config.topic, max_results: maxResults, include_answer: true, include_raw_content: false }),
    });
    if (!upstream.ok) throw new Error(`Search provider returned HTTP ${upstream.status}`);
    const payload = (await upstream.json()) as { answer?: string; results?: TavilyResult[] };
    return { answer: payload.answer ?? "", sources: (payload.results ?? []).filter((item) => item.title && item.url).map((item) => ({ title: item.title as string, url: item.url as string, snippet: item.content, publishedAt: item.published_date, provider: "Tavily" })) };
  } finally { clearTimeout(timeout); }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return Response.json({ error: "Web research is not configured. Set TAVILY_API_KEY on the server." }, { status: 503 });
  let body: SearchRequest;
  try { body = (await req.json()) as SearchRequest; } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const query = body.query?.trim();
  if (!query) return Response.json({ error: "query is required" }, { status: 400 });

  const mode = body.mode ?? "global";
  const modeConfig = MODE_CONFIG[mode];
  const maxResults = Math.min(Math.max(body.maxSources ?? (mode === "deep" || mode === "global" ? 12 : 8), 1), 20);
  const context = (body.context ?? []).filter(Boolean).slice(0, 8);
  const enrichedQuery = `${modeConfig.prefix ? `${modeConfig.prefix}\n` : ""}${query}${context.length ? `\nContext:\n${context.join("\n")}` : ""}`;

  try {
    const queries = [enrichedQuery];
    if (mode === "deep" || mode === "global") queries.push(`${enrichedQuery}\nSeek independent sources and evidence that can confirm or challenge the main findings.`);
    const settled = await Promise.allSettled(queries.map((candidate) => runTavily(apiKey, candidate, modeConfig, Math.ceil(maxResults / queries.length))));
    const passes = settled.filter((r): r is PromiseFulfilledResult<ResearchPass> => r.status === "fulfilled").map((r) => r.value);
    const failures = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    if (!passes.length) return Response.json({ error: "All web research passes failed or timed out.", mode }, { status: 504 });

    const synthesis = synthesizeResearch(passes);
    const researchedAt = new Date().toISOString();
    const researchResult = { query, mode, answer: synthesis.answer, sources: synthesis.sources, claims: synthesis.claims, researchedAt };

    // Persistence is deliberately non-blocking for the user-facing answer. A research
    // result remains usable if the intelligence database is temporarily unavailable.
    let persistenceWarning: string | undefined;
    try { await persistSemanticResearch(researchResult); } catch (error) {
      console.error("Fresh Intelligence persistence error", error);
      persistenceWarning = "Research completed, but the Fresh Intelligence memory layer could not persist this run.";
    }

    const warnings = [...(failures.length ? [`${failures.length} research pass(es) failed or timed out; Fresh returned the successfully completed evidence.`] : []), ...(persistenceWarning ? [persistenceWarning] : [])];
    return Response.json({ answer: synthesis.answer, sources: synthesis.sources, claims: synthesis.claims, verification: synthesis.verification, warnings, mode, searchedAt: researchedAt, intelligencePersisted: !persistenceWarning });
  } catch (error) {
    console.error("Fresh Web Research error", error);
    return Response.json({ error: error instanceof Error ? error.message : "Web research provider unavailable" }, { status: 502 });
  }
}
