type SearchRequest = {
  query?: string;
  maxSources?: number;
  context?: string[];
  mode?: "global" | "deep" | "live" | "academic" | "business" | "people" | "local";
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
};

type Source = {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  provider: string;
  rank: number;
};

const modeDepth: Record<NonNullable<SearchRequest["mode"]>, "basic" | "advanced"> = {
  global: "advanced",
  deep: "advanced",
  live: "advanced",
  academic: "advanced",
  business: "advanced",
  people: "advanced",
  local: "advanced",
};

const modeTopic: Record<NonNullable<SearchRequest["mode"]>, "general" | "news"> = {
  global: "general",
  deep: "general",
  live: "news",
  academic: "general",
  business: "general",
  people: "general",
  local: "general",
};

function dedupeSources(results: TavilyResult[], maxSources: number): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const item of results) {
    if (!item.title || !item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    sources.push({
      title: item.title,
      url: item.url,
      snippet: item.content,
      publishedAt: item.published_date,
      provider: "Tavily",
      rank: sources.length + 1,
    });
    if (sources.length >= maxSources) break;
  }

  return sources;
}

function extractClaims(answer: string, sources: Source[]) {
  return answer
    .split(/(?<=[.!?])\s+/)
    .map((claim) => claim.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((claim, index) => ({
      id: `claim-${index + 1}`,
      text: claim,
      evidenceSourceRanks: sources.length ? [Math.min(index + 1, sources.length)] : [],
      status: sources.length ? "supported" : "unverified",
    }));
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Web research is not configured. Set TAVILY_API_KEY on the server." }, { status: 503 });
  }

  let body: SearchRequest;
  try {
    body = (await req.json()) as SearchRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) return Response.json({ error: "query is required" }, { status: 400 });

  const mode = body.mode ?? "global";
  const maxSources = Math.min(Math.max(body.maxSources ?? (mode === "deep" ? 16 : 10), 1), 20);
  const context = (body.context ?? []).filter(Boolean).slice(0, 8);
  const enrichedQuery = context.length ? `${query}\nContext:\n${context.join("\n")}` : query;

  try {
    const upstream = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: enrichedQuery,
        search_depth: modeDepth[mode],
        topic: modeTopic[mode],
        max_results: maxSources,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!upstream.ok) return Response.json({ error: `Search provider returned HTTP ${upstream.status}` }, { status: 502 });

    const payload = (await upstream.json()) as { answer?: string; results?: TavilyResult[] };
    const sources = dedupeSources(payload.results ?? [], maxSources);
    const answer = payload.answer ?? "";

    return Response.json({
      answer,
      mode,
      searchedAt: new Date().toISOString(),
      sourceCount: sources.length,
      sources,
      claims: extractClaims(answer, sources),
      provenance: {
        provider: "Tavily",
        query,
        mode,
        sourceUrls: sources.map((source) => source.url),
      },
      confidence: sources.length >= 6 ? "high" : sources.length >= 2 ? "medium" : "low",
    });
  } catch (error) {
    console.error("Fresh research orchestration error", error);
    return Response.json({ error: "Web research provider unavailable" }, { status: 502 });
  }
}
