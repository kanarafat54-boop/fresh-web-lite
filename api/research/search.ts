type SearchRequest = {
  query?: string;
  maxSources?: number;
  context?: string[];
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Web research is not configured. Set TAVILY_API_KEY on the server." },
      { status: 503 },
    );
  }

  let body: SearchRequest;
  try {
    body = (await req.json()) as SearchRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  const maxResults = Math.min(Math.max(body.maxSources ?? 8, 1), 20);
  const context = (body.context ?? []).filter(Boolean).slice(0, 8);
  const enrichedQuery = context.length
    ? `${query}\nContext:\n${context.join("\n")}`
    : query;

  try {
    const upstream = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: enrichedQuery,
        search_depth: "advanced",
        topic: "general",
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!upstream.ok) {
      return Response.json(
        { error: `Search provider returned HTTP ${upstream.status}` },
        { status: 502 },
      );
    }

    const payload = (await upstream.json()) as {
      answer?: string;
      results?: TavilyResult[];
    };

    const sources = (payload.results ?? [])
      .filter((item) => item.title && item.url)
      .map((item) => ({
        title: item.title as string,
        url: item.url as string,
        snippet: item.content,
        publishedAt: item.published_date,
        provider: "Tavily",
      }));

    return Response.json({
      answer: payload.answer ?? "",
      sources,
    });
  } catch (error) {
    console.error("Fresh Web Research error", error);
    return Response.json({ error: "Web research provider unavailable" }, { status: 502 });
  }
}
