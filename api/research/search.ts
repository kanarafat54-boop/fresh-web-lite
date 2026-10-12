import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { synthesizeResearch, type ResearchPass } from "../../src/server/research/orchestrator.js";
import { persistSemanticResearch } from "../../src/server/research/persistSemanticResearchV2.js";
import { reasonAcrossDimensions } from "../../src/core/fresh-ai/dimensionalIntelligence.js";

type ResearchMode = "quick" | "deep" | "global" | "live" | "academic" | "business" | "people" | "local";
type SearchRequest = { query?: string; maxSources?: number; context?: string[]; mode?: ResearchMode };
type TavilyResult = { title?: string; url?: string; content?: string; published_date?: string };
type SourceKind = "web" | "news" | "video" | "image" | "music";
export const config = { maxDuration: 60, api: { bodyParser: false } };

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

function elapsed(start: number): number { return Date.now() - start; }
function logStage(runId: string, stage: string, details: Record<string, unknown> = {}): void { console.info("TRUEMODE", { runId, stage, ...details }); }

function sourceKind(url: string, publishedAt?: string, mode?: ResearchMode): SourceKind {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.toLowerCase();
    if (/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|tiktok\.com)$/.test(host)) return "video";
    if (/(spotify\.com|music\.apple\.com|soundcloud\.com|bandcamp\.com|deezer\.com|tidal\.com)$/.test(host)) return "music";
    if (/\.(png|jpe?g|gif|webp|avif|svg)(?:$|\?)/.test(path)) return "image";
    if (mode === "live" || publishedAt) return "news";
  } catch { /* keep web fallback */ }
  return "web";
}

async function runTavily(apiKey: string, query: string, modeConfig: (typeof MODE_CONFIG)[ResearchMode], maxResults: number, runId: string, pass: number, mode: ResearchMode): Promise<ResearchPass> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const started = Date.now();
  logStage(runId, "research.tavily.start", { pass, maxResults });
  try {
    const upstream = await fetch("https://api.tavily.com/search", {
      method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ api_key: apiKey, query, search_depth: modeConfig.searchDepth, topic: modeConfig.topic, max_results: maxResults, include_answer: true, include_raw_content: false }),
    });
    if (!upstream.ok) throw new Error(`Search provider returned HTTP ${upstream.status}`);
    const payload = await upstream.json() as { answer?: string; results?: TavilyResult[] };
    const result = { answer: payload.answer ?? "", sources: (payload.results ?? []).filter((item) => item.title && item.url).map((item) => {
      const url = item.url as string;
      let domain = "unknown";
      try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* preserve unknown */ }
      return { title: item.title as string, url, snippet: item.content, publishedAt: item.published_date, provider: "Tavily", kind: sourceKind(url, item.published_date, mode), domain };
    }) };
    logStage(runId, "research.tavily.complete", { pass, durationMs: elapsed(started), sourceCount: result.sources.length });
    return result;
  } catch (error) {
    logStage(runId, "research.tavily.error", { pass, durationMs: elapsed(started), error: error instanceof Error ? error.message : "unknown" });
    throw error;
  } finally { clearTimeout(timeout); }
}

function json(data: unknown, status = 200, headers?: Record<string, string>): Response { return Response.json(data, { status, headers }); }

// Return a deliberate method response instead of letting unsupported GET requests crash the function.
export function GET(): Response {
  return json({ error: "Method not allowed" }, 405, { Allow: "POST", "Cache-Control": "no-store" });
}

export async function POST(req: Request): Promise<Response> {
  const runId = crypto.randomUUID();
  const requestStarted = Date.now();
  const dryRun = process.env.PERSISTENCE_DRY_RUN === "true";
  logStage(runId, "research.request", { method: req.method, dryRun });
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return json({ error: "Web research is not configured. Set TAVILY_API_KEY on the server.", runId }, 503);
  let body: SearchRequest;
  try { body = await req.json() as SearchRequest; } catch { return json({ error: "Invalid JSON body", runId }, 400); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return json({ error: "query is required", runId }, 400);
  if (query.length > 2_000) return json({ error: "query must be 2000 characters or fewer", runId }, 400);
  const requestedMode: unknown = body.mode ?? "global";
  if (typeof requestedMode !== "string" || !Object.prototype.hasOwnProperty.call(MODE_CONFIG, requestedMode)) {
    return json({ error: "Unsupported research mode", runId }, 400);
  }
  const mode = requestedMode as ResearchMode;
  const modeConfig = MODE_CONFIG[mode];
  const defaultMaxSources = mode === "deep" || mode === "global" ? 10 : 8;
  const requestedMaxSources = typeof body.maxSources === "number" && Number.isFinite(body.maxSources)
    ? Math.trunc(body.maxSources)
    : defaultMaxSources;
  const maxResults = Math.min(Math.max(requestedMaxSources, 1), 16);
  const context = Array.isArray(body.context)
    ? body.context.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 8).map((item) => item.trim())
    : [];
  const enrichedQuery = `${modeConfig.prefix ? `${modeConfig.prefix}\n` : ""}${query}${context.length ? `\nContext:\n${context.join("\n")}` : ""}`;
  try {
    const queries = mode === "deep" || mode === "global" ? [enrichedQuery, `${enrichedQuery}\nSeek independent sources and evidence that can confirm or challenge the main findings.`] : [enrichedQuery];
    const settled = await Promise.allSettled(queries.map((candidate, index) => runTavily(apiKey, candidate, modeConfig, Math.ceil(maxResults / queries.length), runId, index + 1, mode)));
    const passes = settled.filter((result): result is PromiseFulfilledResult<ResearchPass> => result.status === "fulfilled").map((result) => result.value);
    const failures = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (!passes.length) return json({ error: "All web research passes failed or timed out.", mode, runId }, 504);
    const synthesisStarted = Date.now();
    const synthesis = synthesizeResearch(passes);
    const researchedAt = new Date().toISOString();
    const dimensions = reasonAcrossDimensions(query);
    const researchResult = { query, mode, answer: synthesis.answer, sources: synthesis.sources, claims: synthesis.claims, researchedAt };
    logStage(runId, "research.synthesis.complete", { durationMs: elapsed(synthesisStarted), sourceCount: researchResult.sources.length, claimCount: researchResult.claims.length, dimensionalLayers: dimensions.length });
    let persistenceWarning: string | undefined;
    let persistence: Awaited<ReturnType<typeof persistSemanticResearch>> | undefined;
    const persistenceStarted = Date.now();
    let persistenceTimeout: ReturnType<typeof setTimeout> | undefined;
    logStage(runId, "research.persistence.start", { dryRun });
    try {
      const persistencePromise = persistSemanticResearch(researchResult, { dryRun, runId });
      const timeoutPromise = new Promise<never>((_, reject) => { persistenceTimeout = setTimeout(() => reject(new Error("Fresh Intelligence persistence timed out")), 8_000); });
      persistence = await Promise.race([persistencePromise, timeoutPromise]);
      logStage(runId, "research.persistence.complete", { durationMs: elapsed(persistenceStarted), ...persistence });
    } catch (error) {
      console.error("Fresh Intelligence persistence error", { runId, error });
      persistenceWarning = "Research completed, but the Fresh Intelligence memory layer could not persist this run.";
      logStage(runId, "research.persistence.error", { durationMs: elapsed(persistenceStarted), error: error instanceof Error ? error.message : "unknown" });
    } finally {
      if (persistenceTimeout) clearTimeout(persistenceTimeout);
    }
    const warnings = [...(failures.length ? [`${failures.length} research pass(es) failed or timed out; Fresh returned the successfully completed evidence.`] : []), ...(persistenceWarning ? [persistenceWarning] : [])];
    return json({ answer: synthesis.answer, sources: synthesis.sources, claims: synthesis.claims, verification: synthesis.verification, warnings, mode, searchedAt: researchedAt, runId, persistence: persistence ?? null, intelligencePersisted: !dryRun && Boolean(persistence) && !persistenceWarning }, 200, { "x-truemode-run-id": runId });
  } catch (error) {
    console.error("Fresh Web Research error", { runId, error });
    return json({ error: error instanceof Error ? error.message : "Web research provider unavailable", runId }, 502);
  } finally { logStage(runId, "research.request.complete", { durationMs: elapsed(requestStarted) }); }
}

export default createVercelNodeHandler({ GET, POST });
