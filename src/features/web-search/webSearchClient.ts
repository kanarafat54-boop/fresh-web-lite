import type { SearchApiResponse } from "../../server/search/service.js";

export type { SearchApiResponse };

export class WebSearchError extends Error {
  code: string;
  retryable: boolean;
  status: number;
  constructor(code: string, message: string, retryable: boolean, status = 0) {
    super(message);
    this.name = "WebSearchError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isStrOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";

/** Strictly validates the API payload so a malformed or tampered response is an error, never rendered. */
export function parseWebSearchResponse(data: unknown): SearchApiResponse {
  const bad = (why: string) => new WebSearchError("malformed_response", `The search service returned an unreadable response (${why}).`, true);
  if (!isObj(data) || !isStr(data.query) || !Array.isArray(data.results) || !Array.isArray(data.warnings) || !isObj(data.evidence) || !isObj(data.persistence)) throw bad("shape");
  for (const r of data.results) {
    if (!isObj(r) || !isStr(r.url) || !/^https?:\/\//i.test(r.url) || !isStr(r.title) || !isStr(r.retrievedAt) || !isStrOrNull(r.publishedAt) || !isStrOrNull(r.language)
      || typeof r.score !== "number" || !Array.isArray(r.passages) || !r.passages.every((p) => isObj(p) && isStr(p.text) && isStr(p.id))) throw bad("result");
  }
  if (!data.warnings.every(isStr)) throw bad("warnings");
  if (!Array.isArray(data.evidence.items)) throw bad("evidence");
  const status = (data.persistence as Record<string, unknown>).status;
  if (status !== "persisted" && status !== "skipped" && status !== "failed") throw bad("persistence");
  return data as unknown as SearchApiResponse;
}

export async function searchFreshWeb(
  query: string,
  options: { getToken: () => Promise<string | null>; fetchImpl?: typeof fetch; signal?: AbortSignal; endpoint?: string },
): Promise<SearchApiResponse> {
  const token = await options.getToken();
  if (!token) throw new WebSearchError("unauthorized", "Sign in to search the Fresh index.", false, 401);
  let res: Response;
  try {
    res = await (options.fetchImpl ?? fetch)(options.endpoint ?? "/api/search/query", {
      method: "POST", signal: options.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ query }),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new WebSearchError("network_error", "Could not reach the Fresh search service.", true);
  }
  let payload: unknown;
  try { payload = await res.json(); } catch { throw new WebSearchError("malformed_response", "The search service returned an unreadable response (not JSON).", true, res.status); }
  if (!res.ok) {
    const err = isObj(payload) && isObj(payload.error) ? payload.error : {};
    throw new WebSearchError(isStr(err.code) ? err.code : "http_error", isStr(err.message) ? err.message : `Search failed with HTTP ${res.status}.`, err.retryable === true, res.status);
  }
  return parseWebSearchResponse(payload);
}
