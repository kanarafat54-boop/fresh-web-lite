import type { ContentParser, CrawlerAdapter, CrawlOutcome, IndexWriter, StructuredError } from "./contracts.js";
import { canonicalizeUrl, sha256Hex } from "./url.js";

export interface IngestReport {
  url: string;
  outcome: CrawlOutcome | "indexed" | "unchanged" | "removed" | "noindex" | "parse_error";
  attempts: number;
  documentId?: string;
  version?: number;
  error?: StructuredError;
}

const RETRYABLE: ReadonlySet<CrawlOutcome> = new Set(["timeout", "network_error", "http_error"]);

/** Crawl -> parse -> hash -> index with bounded retries. Returns structured per-URL results, never throws. */
export async function ingestUrl(
  url: string,
  deps: { crawler: CrawlerAdapter; parser: ContentParser; writer: IndexWriter },
  options: { maxAttempts?: number; backoffMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<IngestReport> {
  const max = options.maxAttempts ?? 3;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let attempts = 0;
  for (;;) {
    attempts++;
    const result = await deps.crawler.fetch(url);
    if (result.outcome === "fetched" && result.resource) {
      try {
        const parsed = deps.parser.parse(result.resource);
        if (parsed.noindex) return { url, outcome: "noindex", attempts };
        parsed.contentHash = await sha256Hex(parsed.text);
        const v = await deps.writer.upsert(parsed, { fetchedAt: result.resource.fetchedAt, sourceUrl: result.resource.finalUrl });
        return { url, outcome: v.status === "unchanged" ? "unchanged" : "indexed", attempts, documentId: v.documentId, version: v.version };
      } catch (e) {
        return { url, outcome: "parse_error", attempts, error: { code: "parse_error", message: (e as Error).message, retryable: false } };
      }
    }
    const retryable = RETRYABLE.has(result.outcome) && !(result.outcome === "http_error" && /HTTP 4\d\d/.test(result.detail ?? "") && !/HTTP 429/.test(result.detail ?? ""));
    if (result.outcome === "http_error" && /HTTP (404|410)/.test(result.detail ?? "")) {
      const removed = await deps.writer.markRemoved(canonicalizeUrl(url) ?? url, new Date().toISOString());
      return { url, outcome: removed ? "removed" : "http_error", attempts, error: { code: "gone", message: result.detail ?? "gone", retryable: false } };
    }
    if (retryable && attempts < max) { await sleep((options.backoffMs ?? 500) * 2 ** (attempts - 1)); continue; }
    return { url, outcome: result.outcome, attempts, error: { code: result.outcome, message: result.detail ?? result.outcome, retryable } };
  }
}
