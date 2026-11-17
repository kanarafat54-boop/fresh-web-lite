import { createVercelNodeHandler } from "../src/server/vercelNodeAdapter.js";
import { discover, isGlobalSystem, MIN_QUERY } from "../src/core/discovery/globalDiscovery.js";

export const config = { maxDuration: 20 };

const json = (body: unknown, status = 200, cache = "no-store") =>
  Response.json(body, { status, headers: { "cache-control": cache } });

/**
 * GET /api/discover?system=fresh-news&q=flood
 * Searches open public catalogs for one Fresh Flow system. Free sources, no keys. Results are cached briefly at the edge
 * because the catalogs rate-limit and the same searches repeat.
 */
async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const system = url.searchParams.get("system") ?? "";
  if (!isGlobalSystem(system)) return json({ error: "This system does not search outside Fresh." }, 400);
  try {
    const result = await discover(system, url.searchParams.get("q"), (target, init) => fetch(target, init), { limit: 10 });
    const allFailed = result.providers.every((p) => !p.ok);
    return json(result, allFailed ? 502 : 200, allFailed ? "no-store" : "public, s-maxage=300, stale-while-revalidate=600");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return json({ error: message, minQuery: MIN_QUERY }, 400);
  }
}

export default createVercelNodeHandler({ GET });
