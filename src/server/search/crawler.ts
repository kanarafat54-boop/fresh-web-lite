import type { CrawlerAdapter, CrawlResult } from "./contracts.js";
import { canonicalizeUrl, isPrivateOrInternalHost } from "./url.js";
import { isAllowed, parseRobots, selectGroup, type RobotsRules } from "./robots.js";

export interface CrawlerOptions {
  userAgent: string;
  maxBytes?: number;
  timeoutMs?: number;
  minDelayMs?: number;
  maxRedirects?: number;
  /** Test/infra hook only; production uses global fetch. */
  fetchImpl?: typeof fetch;
  /** Allow loopback hosts. Only for local test fixtures; never set in production code paths. */
  allowPrivateHosts?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function concat(chunks: Uint8Array[], size: number): Uint8Array {
  const out = new Uint8Array(size); let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}

const TEXT_TYPES = /^(text\/html|application\/xhtml\+xml|text\/plain)\b/i;

/** Polite, bounded crawler: robots.txt, per-host rate limit, size/time caps, SSRF guard, conditional GET. */
export class PoliteCrawler implements CrawlerAdapter {
  private robotsCache = new Map<string, { rules: RobotsRules | null; fetchedAt: number }>();
  private lastHit = new Map<string, number>();
  private o: {
    userAgent: string; maxBytes: number; timeoutMs: number; minDelayMs: number; maxRedirects: number;
    allowPrivateHosts: boolean; fetchImpl: typeof fetch; now: () => number; sleep: (ms: number) => Promise<void>;
  };

  constructor(options: CrawlerOptions) {
    this.o = {
      userAgent: options.userAgent,
      maxBytes: options.maxBytes ?? 1_500_000,
      timeoutMs: options.timeoutMs ?? 10_000,
      minDelayMs: options.minDelayMs ?? 1_000,
      maxRedirects: options.maxRedirects ?? 3,
      allowPrivateHosts: options.allowPrivateHosts ?? false,
      fetchImpl: options.fetchImpl ?? globalThis.fetch.bind(globalThis),
      now: options.now ?? (() => Date.now()),
      sleep: options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))),
    };
  }

  private async guarded(url: string, headers: Record<string, string>): Promise<Response> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.o.timeoutMs);
    try { return await this.o.fetchImpl(url, { headers: { "user-agent": this.o.userAgent, ...headers }, redirect: "manual", signal: ctl.signal }); }
    finally { clearTimeout(timer); }
  }

  private async throttle(host: string, crawlDelaySec?: number): Promise<void> {
    const gap = Math.max(this.o.minDelayMs, (crawlDelaySec ?? 0) * 1000);
    const wait = (this.lastHit.get(host) ?? 0) + gap - this.o.now();
    if (wait > 0) await this.o.sleep(wait);
    this.lastHit.set(host, this.o.now());
  }

  private async robotsFor(url: URL): Promise<RobotsRules | null> {
    const cached = this.robotsCache.get(url.origin);
    if (cached && this.o.now() - cached.fetchedAt < 3_600_000) return cached.rules;
    let rules: RobotsRules | null = null;
    try {
      const res = await this.guarded(`${url.origin}/robots.txt`, {});
      if (res.status === 200) rules = parseRobots((await res.text()).slice(0, 500_000));
      else if (res.status >= 500) rules = { groups: [{ agents: ["*"], rules: [{ allow: false, path: "/" }] }] }; // RFC 9309: unreachable => disallow
    } catch { rules = { groups: [{ agents: ["*"], rules: [{ allow: false, path: "/" }] }] }; }
    this.robotsCache.set(url.origin, { rules, fetchedAt: this.o.now() });
    return rules;
  }

  async fetch(requestedUrl: string, options: { etag?: string; lastModified?: string } = {}): Promise<CrawlResult> {
    let current = canonicalizeUrl(requestedUrl);
    if (!current) return { outcome: "blocked_by_policy", requestedUrl, detail: "Unsupported or invalid URL" };
    for (let hop = 0; hop <= this.o.maxRedirects; hop++) {
      const url = new URL(current);
      if (!this.o.allowPrivateHosts && isPrivateOrInternalHost(url.hostname)) return { outcome: "blocked_by_policy", requestedUrl, detail: "Private or internal host" };
      const robots = await this.robotsFor(url);
      if (robots && !isAllowed(robots, this.o.userAgent, url.pathname + url.search)) return { outcome: "blocked_by_robots", requestedUrl, detail: `robots.txt disallows ${url.pathname}` };
      await this.throttle(url.host, robots ? selectGroup(robots, this.o.userAgent)?.crawlDelay : undefined);
      let res: Response;
      try {
        res = await this.guarded(current, { accept: "text/html,application/xhtml+xml,text/plain;q=0.8", ...(options.etag ? { "if-none-match": options.etag } : {}), ...(options.lastModified ? { "if-modified-since": options.lastModified } : {}) });
      } catch (e) {
        return { outcome: (e as Error)?.name === "AbortError" ? "timeout" : "network_error", requestedUrl, detail: (e as Error)?.message };
      }
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const next = canonicalizeUrl(res.headers.get("location") ?? "", current);
        if (!next) return { outcome: "http_error", requestedUrl, detail: `Bad redirect from ${res.status}` };
        current = next; continue;
      }
      if (res.status === 304) return { outcome: "not_modified", requestedUrl };
      if (!res.ok) return { outcome: "http_error", requestedUrl, detail: `HTTP ${res.status}` };
      const contentType = res.headers.get("content-type") ?? "";
      if (!TEXT_TYPES.test(contentType)) return { outcome: "unsupported_content_type", requestedUrl, detail: contentType || "missing content-type" };
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > this.o.maxBytes) return { outcome: "too_large", requestedUrl, detail: `content-length ${declared}` };
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      if (reader) while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > this.o.maxBytes) { await reader.cancel(); return { outcome: "too_large", requestedUrl, detail: `exceeded ${this.o.maxBytes} bytes` }; }
        chunks.push(value);
      }
      const body = new TextDecoder("utf-8", { fatal: false }).decode(concat(chunks, size));
      return { outcome: "fetched", requestedUrl, resource: { requestedUrl, finalUrl: current, status: res.status, contentType, body, fetchedAt: new Date(this.o.now()).toISOString(), etag: res.headers.get("etag") ?? undefined, lastModified: res.headers.get("last-modified") ?? undefined } };
    }
    return { outcome: "http_error", requestedUrl, detail: "Too many redirects" };
  }
}
