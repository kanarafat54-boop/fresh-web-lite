import type { EvidenceBundle, EvidenceItem, SearchProvider, SearchQuery, SearchResponse, StructuredError } from "./contracts.js";
import { IndexEvidenceService } from "./evidence.js";

export interface AuthUser { id: string }

export interface EvidenceStore {
  /** Persist verified, public-source evidence. Must throw on failure; never report success it did not achieve. */
  persist(user: AuthUser, bundle: EvidenceBundle, hits: SearchResponse["hits"]): Promise<{ sources: number; evidence: number }>;
}

export class SearchProviderError extends Error {
  code: "index_unavailable" | "malformed_response" | "provider_failed";
  retryable: boolean;
  constructor(code: SearchProviderError["code"], message: string, retryable = false) {
    super(message);
    this.name = "SearchProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface RateLimiter { allow(key: string): boolean }

/** Fixed-window limiter. Per-instance memory only: best-effort abuse damping, not a global quota. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = () => Date.now()): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    allow(key: string) {
      const t = now();
      const w = windows.get(key);
      if (!w || t - w.start >= windowMs) { windows.set(key, { start: t, count: 1 }); return true; }
      w.count += 1;
      return w.count <= limit;
    },
  };
}

export interface SearchServiceDeps {
  authenticate(req: Request): Promise<AuthUser | null>;
  provider: SearchProvider;
  store?: EvidenceStore | null;
  limiter?: RateLimiter;
  now?: () => number;
}

export type PersistenceReport =
  | { status: "persisted"; sources: number; evidence: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: StructuredError };

export interface SearchApiResult {
  documentId: string;
  url: string;
  title: string;
  language: string | null;
  publishedAt: string | null;
  retrievedAt: string;
  score: number;
  passages: Array<{ id: string; text: string; score: number }>;
}

export interface SearchApiResponse {
  query: string;
  results: SearchApiResult[];
  evidence: { items: EvidenceItem[]; independentSourceCount: number; duplicateGroups: EvidenceBundle["duplicateGroups"] };
  warnings: string[];
  persistence: PersistenceReport;
  indexedDocuments: number | null;
  tookMs: number;
}

const MAX_BODY_BYTES = 8_192;
const MAX_QUERY_CHARS = 500;

function errorResponse(status: number, code: string, message: string, retryable = false, headers: Record<string, string> = {}): Response {
  const error: StructuredError = { code, message, retryable };
  return Response.json({ error }, { status, headers: { "cache-control": "no-store", ...headers } });
}

const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));
const isHttpUrl = (v: unknown): boolean => {
  if (typeof v !== "string") return false;
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
};

/**
 * Citation validation: an evidence item is returned only if it carries a real http(s) source URL,
 * a non-empty passage that is verbatim one of the passages the provider returned for that URL,
 * a SHA-256 content hash and a valid retrieval timestamp. Anything else is dropped and reported.
 */
export function validateCitations(items: EvidenceItem[], hits: SearchResponse["hits"]): { valid: EvidenceItem[]; rejected: number } {
  const passagesByUrl = new Map(hits.map((h) => [h.canonicalUrl, new Set(h.passages.map((p) => p.text))]));
  const valid = items.filter((i) =>
    isHttpUrl(i.sourceUrl) &&
    typeof i.passage === "string" && i.passage.trim().length > 0 &&
    passagesByUrl.get(i.sourceUrl)?.has(i.passage) === true &&
    /^[0-9a-f]{64}$/.test(i.contentHash) &&
    isIso(i.retrievedAt) && (i.publishedAt === null || isIso(i.publishedAt)));
  return { valid, rejected: items.length - valid.length };
}

export async function handleSearchRequest(req: Request, deps: SearchServiceDeps): Promise<Response> {
  const now = deps.now ?? (() => Date.now());
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed", "Use POST.", false, { allow: "POST" });

  let user: AuthUser | null = null;
  try { user = await deps.authenticate(req); } catch { return errorResponse(503, "auth_unavailable", "Authentication could not be verified.", true); }
  if (!user) return errorResponse(401, "unauthorized", "Sign in to search the Fresh index.");
  if (deps.limiter && !deps.limiter.allow(user.id)) return errorResponse(429, "rate_limited", "Too many searches. Try again shortly.", true, { "retry-after": "60" });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return errorResponse(413, "payload_too_large", "Request body is too large.");
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return errorResponse(413, "payload_too_large", "Request body is too large.");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return errorResponse(400, "invalid_request", "Body must be valid JSON."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return errorResponse(400, "invalid_request", "Body must be a JSON object.");
  const { query, language, limit } = body as Record<string, unknown>;
  if (typeof query !== "string" || !query.trim()) return errorResponse(400, "invalid_request", "query is required.");
  if (query.length > MAX_QUERY_CHARS) return errorResponse(400, "invalid_request", `query must be ${MAX_QUERY_CHARS} characters or fewer.`);
  if (language !== undefined && (typeof language !== "string" || !/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(language))) return errorResponse(400, "invalid_request", "language must be a BCP-47 tag.");
  if (limit !== undefined && (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 25)) return errorResponse(400, "invalid_request", "limit must be an integer from 1 to 25.");

  // Capture the provider response (or failure) so evidence is validated against exactly what was retrieved.
  const started = now();
  const state: { response: SearchResponse | null; failure: (Error & { code?: string }) | null } = { response: null, failure: null };
  const recording: SearchProvider = {
    id: deps.provider.id,
    async search(q: SearchQuery) {
      try { state.response = await deps.provider.search({ ...q, language: language as string | undefined }); return state.response; }
      catch (e) { state.failure = e as Error; throw e; }
    },
  };
  const limitN = (limit as number | undefined) ?? 10;
  const bundle = await new IndexEvidenceService(recording).gather(query.trim(), { maxItems: limitN });
  if (state.failure) {
    const code = state.failure.code;
    if (code === "index_unavailable") return errorResponse(503, "index_unavailable", "The Fresh web index is not available yet.", true);
    if (code === "malformed_response") return errorResponse(502, "provider_malformed", "The search backend returned an unreadable response.", true);
    return errorResponse(502, "provider_failed", "The search backend failed.", true);
  }
  const response = state.response;
  if (!response) return errorResponse(400, "invalid_request", "Query has no searchable terms.");

  const { valid, rejected } = validateCitations(bundle.items, response.hits);
  const warnings = [...bundle.warnings];
  if (rejected) warnings.push(`${rejected} evidence item(s) failed citation validation and were withheld.`);

  const validUrls = new Set(valid.map((i) => i.sourceUrl));
  const results: SearchApiResult[] = response.hits.filter((h) => isHttpUrl(h.canonicalUrl) && validUrls.has(h.canonicalUrl)).map((h) => ({
    documentId: h.documentId, url: h.canonicalUrl, title: h.title || h.canonicalUrl, language: h.language, publishedAt: h.publishedAt,
    retrievedAt: h.fetchedAt, score: Number(h.score.toFixed(4)), passages: h.passages.map((p) => ({ id: p.passageId, text: p.text, score: Number(p.score.toFixed(4)) })),
  }));

  let persistence: PersistenceReport;
  if (!deps.store) persistence = { status: "skipped", reason: "Evidence persistence is not configured." };
  else if (!valid.length) persistence = { status: "skipped", reason: "No valid evidence to persist." };
  else {
    try {
      const saved = await deps.store.persist(user, { ...bundle, items: valid }, response.hits);
      persistence = { status: "persisted", ...saved };
    } catch (e) {
      persistence = { status: "failed", error: { code: "persistence_failed", message: "Results were found but could not be saved as research evidence.", retryable: true } };
      warnings.push("Research evidence could not be saved; results below are still valid.");
      console.error("Fresh web search persistence failed", { userId: user.id, message: (e as Error).message });
    }
  }

  const payload: SearchApiResponse = {
    query: query.trim(), results,
    evidence: { items: valid, independentSourceCount: new Set(valid.map((i) => i.contentHash)).size, duplicateGroups: bundle.duplicateGroups },
    warnings, persistence, indexedDocuments: response.indexedDocuments, tookMs: now() - started,
  };
  return Response.json(payload, { status: 200, headers: { "cache-control": "no-store" } });
}
