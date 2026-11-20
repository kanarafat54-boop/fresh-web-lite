import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { discover, isGlobalSystem } from "../../src/core/discovery/globalDiscovery.js";
import { synthesizeResearch, type ResearchPass } from "../../src/server/research/orchestrator.js";
import { persistSemanticResearch } from "../../src/server/research/persistSemanticResearchV2.js";
import { reasonAcrossDimensions } from "../../src/core/fresh-ai/dimensionalIntelligence.js";
import { createEvidencePassport } from "../../src/core/research/evidencePassport.js";
import { mapAnswerToPassages } from "../../src/core/research/claimEvidence.js";
import { checkFreshResearchRateLimit, type ResearchRateLimitResult } from "../../src/server/research/researchRateLimit.js";

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

function needsAdaptiveNewsSearch(query: string, mode: ResearchMode, verification: ReturnType<typeof synthesizeResearch>["verification"]): boolean {
  const currentEntityIntent = /\b(what'?s happening|what is happening|latest|trending|news about|updates on|recent developments|current developments|today)\b/i.test(query);
  const hasSubject = query.replace(/\b(what'?s happening|what is happening|latest|trending|news about|updates on|recent developments|current developments|today)\b/ig, " ").trim().length >= 2;
  return (mode === "global" || mode === "deep" || mode === "live") && currentEntityIntent && hasSubject
    && (verification.uniqueDomains < 3 || verification.newsSources === 0);
}


/**
 * GET /api/discover?system=fresh-news&q=flood (routed here by vercel.json to stay inside the Hobby plan's function limit).
 * Searches open public catalogs for one Fresh Flow system. Free sources, no keys. Cached briefly at the edge because the
 * catalogs rate-limit and the same searches repeat. Any other GET is still refused.
 */
async function discoverGET(url: URL): Promise<Response> {
  const system = url.searchParams.get("system") ?? "";
  if (!isGlobalSystem(system)) return json({ error: "This system does not search outside Fresh." }, 400, { "Cache-Control": "no-store" });
  try {
    const result = await discover(system, url.searchParams.get("q"), (target, init) => fetch(target, init), { limit: 10 });
    const allFailed = result.providers.every((p) => !p.ok);
    return json(result, allFailed ? 502 : 200, { "Cache-Control": allFailed ? "no-store" : "public, s-maxage=300, stale-while-revalidate=600" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Search failed." }, 400, { "Cache-Control": "no-store" });
  }
}

// Anything but discovery gets a deliberate method response instead of letting unsupported GET requests crash the function.
export function GET(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.get("__fresh_discover") === "1") return discoverGET(url);
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
  let rateLimit: ResearchRateLimitResult;
  try {
    rateLimit = await checkFreshResearchRateLimit(req);
  } catch (error) {
    logStage(runId, "research.rate-limit.error", { error: error instanceof Error ? error.message : "unknown" });
    return json({ error: "Fresh Research is temporarily unavailable because request protection could not be verified.", runId }, 503, { "Cache-Control": "no-store" });
  }
  if (!rateLimit.configured) {
    logStage(runId, "research.rate-limit.unavailable");
    return json({ error: "Fresh Research is temporarily unavailable because request protection is not configured.", runId }, 503, { "Cache-Control": "no-store" });
  }
  if (!rateLimit.allowed) {
    logStage(runId, "research.rate-limit.blocked", { limit: rateLimit.limit, windowSeconds: rateLimit.windowSeconds });
    return json({ error: "Research request limit reached. Please wait before searching again.", runId }, 429, {
      "Cache-Control": "no-store",
      "Retry-After": String(rateLimit.retryAfterSeconds),
      "X-RateLimit-Limit": String(rateLimit.limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Limit-Minute": String(rateLimit.limit),
      "X-RateLimit-Limit-Hour": String(rateLimit.hourLimit),
      "X-RateLimit-Limit-Day": String(rateLimit.dayLimit),
    });
  }
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Limit-Minute": String(rateLimit.limit),
    "X-RateLimit-Limit-Hour": String(rateLimit.hourLimit),
    "X-RateLimit-Limit-Day": String(rateLimit.dayLimit),
  };
  try {
    const queries = mode === "deep" || mode === "global" ? [enrichedQuery, `${enrichedQuery}\nSeek independent sources and evidence that can confirm or challenge the main findings.`] : [enrichedQuery];
    const settled = await Promise.allSettled(queries.map((candidate, index) => runTavily(apiKey, candidate, modeConfig, Math.ceil(maxResults / queries.length), runId, index + 1, mode)));
    const passes = settled.filter((result): result is PromiseFulfilledResult<ResearchPass> => result.status === "fulfilled").map((result) => result.value);
    const failures = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (!passes.length) return json({ error: "All web research passes failed or timed out.", mode, runId }, 504);
    const synthesisStarted = Date.now();
    let synthesis = synthesizeResearch(passes);
    let adaptiveNewsAttempted = false;
    let adaptiveNewsFailed = false;
    if (needsAdaptiveNewsSearch(query, mode, synthesis.verification)) {
      adaptiveNewsAttempted = true;
      const monthYear = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date());
      try {
        const expandedQuery = `${query}\nLatest news and developments as of ${monthYear}. Find independent publishers, primary reporting, and recent publication dates.`;
        const newsPass = await runTavily(apiKey, expandedQuery, { searchDepth: "advanced", topic: "news" }, Math.min(maxResults, 8), runId, passes.length + 1, "live");
        passes.push(newsPass);
        synthesis = synthesizeResearch(passes);
        logStage(runId, "research.adaptive-news.complete", { uniqueDomains: synthesis.verification.uniqueDomains, newsSources: synthesis.verification.newsSources });
      } catch (error) {
        adaptiveNewsFailed = true;
        logStage(runId, "research.adaptive-news.error", { error: error instanceof Error ? error.message : "unknown" });
      }
    }
    const researchedAt = new Date().toISOString();
    const dimensions = reasonAcrossDimensions(query);
    const researchSources = synthesis.sources.flatMap((source) => {
      try { const evidencePassport = createEvidencePassport(source, researchedAt); return [{ ...source, publishedAt: evidencePassport.source.publishedAt, kind: source.kind ?? sourceKind(source.url, evidencePassport.source.publishedAt, mode), evidencePassport }]; }
      catch { return []; }
    });
    const invalidSourceCount = synthesis.sources.length - researchSources.length;
    if (!researchSources.length) return json({ error: "Fresh Research did not receive a valid HTTP(S) source URL to preserve as evidence.", warnings: ["No evidence passports were issued; no factual answer was returned."], mode, runId }, 502);
    // Which statements of the answer does a captured source passage actually contain? The exact quotes ride along so they can be checked and persisted.
    const answerEvidence = mapAnswerToPassages(synthesis.answer, researchSources.flatMap((source) => (source.evidencePassport ? [source.evidencePassport] : [])));
    const researchResult = { query, mode, answer: synthesis.answer, sources: researchSources, claims: synthesis.claims, answerEvidence, researchedAt };
    logStage(runId, "research.claims.mapped", answerEvidence.summary);
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
    const warnings = [...(failures.length ? [`${failures.length} research pass(es) failed or timed out; Fresh returned the successfully completed evidence.`] : []), ...(adaptiveNewsFailed ? ["Fresh attempted a broader current-news search, but that additional provider pass failed. The available evidence is still shown with its limitations."] : []), ...(adaptiveNewsAttempted && (synthesis.verification.uniqueDomains < 3 || synthesis.verification.newsSources === 0) ? ["Source coverage remains limited after an automatic broader news search. Treat this as preliminary and open the original sources before relying on it."] : []), ...(invalidSourceCount ? [`${invalidSourceCount} source record(s) were excluded because they could not receive a valid HTTP(S) Evidence Passport.`] : []), ...(persistenceWarning ? [persistenceWarning] : [])];
    return json({ answer: synthesis.answer, sources: researchResult.sources, claims: synthesis.claims, answerEvidence, verification: synthesis.verification, warnings, mode, searchedAt: researchedAt, runId, persistence: persistence ?? null, intelligencePersisted: !dryRun && Boolean(persistence) && !persistenceWarning }, 200, { "x-truemode-run-id": runId, ...rateLimitHeaders, "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Fresh Web Research error", { runId, error });
    return json({ error: error instanceof Error ? error.message : "Web research provider unavailable", runId }, 502);
  } finally { logStage(runId, "research.request.complete", { durationMs: elapsed(requestStarted) }); }
}

export default createVercelNodeHandler({ GET, POST });
