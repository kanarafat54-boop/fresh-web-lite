/**
 * Global discovery: open public catalogs that Fresh Flow systems can search beyond Fresh itself.
 * Each provider builds a request and turns the reply into one shape. Fresh links to the original source and never copies full works.
 * All providers here are free and need no key. Nothing in this file touches the network.
 */
export type DiscoveryKind = "news" | "music" | "book" | "lesson" | "paper" | "article";

export type DiscoveryItem = {
  id: string;
  kind: DiscoveryKind;
  title: string;
  /** Artist, author or byline when the source gives one. */
  creator?: string;
  /** Who published it: a news domain, a catalog name. */
  source: string;
  /** Where the original lives. Always http(s). */
  url: string;
  publishedAt?: string;
  summary?: string;
  imageUrl?: string;
  /** A short preview the provider allows (music only). */
  previewUrl?: string;
  /** What the person may do with it, as stated by the provider. */
  access?: string;
};

export type Provider = {
  id: string;
  label: string;
  kind: DiscoveryKind;
  request: (query: string, limit: number) => string;
  parse: (payload: unknown) => DiscoveryItem[];
};

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Only web addresses are kept; anything else (javascript:, data:, relative) is dropped. */
export function safeUrl(value: unknown): string | undefined {
  const text = str(value);
  if (!text) return undefined;
  try { const u = new URL(text); return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined; } catch { return undefined; }
}
const secure = (value: unknown): string | undefined => { const u = safeUrl(value); return u?.startsWith("https:") ? u : undefined; };

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#0?39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
}
/** GDELT dates look like 20261117T093000Z. */
export function gdeltDate(value: string): string | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : undefined;
}
const enc = encodeURIComponent;
const clamp = (n: number) => Math.max(1, Math.min(25, Math.floor(n)));

export const gdelt: Provider = {
  id: "gdelt", label: "GDELT news index", kind: "news",
  request: (q, n) => `https://api.gdeltproject.org/api/v2/doc/doc?query=${enc(q)}&mode=artlist&format=json&sort=datedesc&maxrecords=${clamp(n)}`,
  parse: (payload) => arr(obj(payload).articles).flatMap((raw) => {
    const a = obj(raw), url = safeUrl(a.url), title = str(a.title);
    if (!url || !title) return [];
    const domain = str(a.domain) || new URL(url).hostname;
    return [{ id: `gdelt:${url}`, kind: "news" as const, title, source: domain, url, publishedAt: gdeltDate(str(a.seendate)), imageUrl: secure(a.socialimage), access: "Opens at the publisher" }];
  }),
};

export const itunes: Provider = {
  id: "itunes", label: "Apple music catalog", kind: "music",
  request: (q, n) => `https://itunes.apple.com/search?term=${enc(q)}&media=music&entity=song&limit=${clamp(n)}`,
  parse: (payload) => arr(obj(payload).results).flatMap((raw) => {
    const r = obj(raw), url = safeUrl(r.trackViewUrl), title = str(r.trackName);
    if (!url || !title) return [];
    return [{ id: `itunes:${r.trackId ?? url}`, kind: "music" as const, title, creator: str(r.artistName) || undefined, source: str(r.collectionName) || "Apple Music", url, publishedAt: str(r.releaseDate) || undefined, imageUrl: secure(r.artworkUrl100), previewUrl: secure(r.previewUrl), access: "30-second preview; full track plays at the provider" }];
  }),
};

export const openLibrary: Provider = {
  id: "openlibrary", label: "Open Library", kind: "book",
  request: (q, n) => `https://openlibrary.org/search.json?q=${enc(q)}&limit=${clamp(n)}&fields=key,title,author_name,first_publish_year,cover_i,has_fulltext`,
  parse: (payload) => arr(obj(payload).docs).flatMap((raw) => {
    const d = obj(raw), key = str(d.key), title = str(d.title);
    if (!key.startsWith("/") || !title) return [];
    const authors = arr(d.author_name).map(str).filter(Boolean);
    const cover = typeof d.cover_i === "number" ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined;
    return [{ id: `ol:${key}`, kind: "book" as const, title, creator: authors.slice(0, 3).join(", ") || undefined, source: "Open Library", url: `https://openlibrary.org${key}`, publishedAt: typeof d.first_publish_year === "number" ? String(d.first_publish_year) : undefined, imageUrl: cover, access: d.has_fulltext ? "May be borrowable or readable at Open Library" : "Catalog entry; find a copy through Open Library" }];
  }),
};

export const gutendex: Provider = {
  id: "gutendex", label: "Project Gutenberg", kind: "book",
  request: (q, n) => `https://gutendex.com/books/?search=${enc(q)}&page_size=${clamp(n)}`,
  parse: (payload) => arr(obj(payload).results).flatMap((raw) => {
    const b = obj(raw), formats = obj(b.formats), title = str(b.title), id = b.id;
    const url = safeUrl(formats["text/html"]) ?? (typeof id === "number" ? `https://www.gutenberg.org/ebooks/${id}` : undefined);
    if (!url || !title) return [];
    const authors = arr(b.authors).map((a) => str(obj(a).name)).filter(Boolean);
    return [{ id: `pg:${id ?? url}`, kind: "book" as const, title, creator: authors.slice(0, 3).join("; ") || undefined, source: "Project Gutenberg", url, imageUrl: secure(formats["image/jpeg"]), access: "Free to read: public domain" }];
  }),
};

function wiki(id: string, label: string, host: string, kind: DiscoveryKind, access: string): Provider {
  return {
    id, label, kind,
    request: (q, n) => `https://${host}/w/api.php?action=query&list=search&srsearch=${enc(q)}&srlimit=${clamp(n)}&format=json&origin=*`,
    parse: (payload) => arr(obj(obj(payload).query).search).flatMap((raw) => {
      const r = obj(raw), title = str(r.title), pageid = r.pageid;
      if (!title || typeof pageid !== "number") return [];
      return [{ id: `${id}:${pageid}`, kind, title, source: label, url: `https://${host}/?curid=${pageid}`, publishedAt: str(r.timestamp) || undefined, summary: stripHtml(str(r.snippet)) || undefined, access }];
    }),
  };
}
export const wikipedia = wiki("wikipedia", "Wikipedia", "en.wikipedia.org", "article", "Free to read; text is CC BY-SA");
export const wikiversity = wiki("wikiversity", "Wikiversity", "en.wikiversity.org", "lesson", "Free learning resources; text is CC BY-SA");
export const wikibooks = wiki("wikibooks", "Wikibooks", "en.wikibooks.org", "lesson", "Free open textbooks; text is CC BY-SA");

export const openAlex: Provider = {
  id: "openalex", label: "OpenAlex", kind: "paper",
  request: (q, n) => `https://api.openalex.org/works?search=${enc(q)}&per-page=${clamp(n)}&select=id,display_name,publication_year,doi,authorships,primary_location,open_access,cited_by_count`,
  parse: (payload) => arr(obj(payload).results).flatMap((raw) => {
    const w = obj(raw), title = str(w.display_name);
    const loc = obj(w.primary_location), oa = obj(w.open_access);
    const url = safeUrl(w.doi) ?? safeUrl(loc.landing_page_url) ?? safeUrl(w.id);
    if (!title || !url) return [];
    const authors = arr(w.authorships).map((a) => str(obj(obj(a).author).display_name)).filter(Boolean);
    const venue = str(obj(loc.source).display_name);
    return [{ id: `oa:${str(w.id) || url}`, kind: "paper" as const, title, creator: authors.slice(0, 4).join(", ") + (authors.length > 4 ? " et al." : "") || undefined, source: venue || "OpenAlex", url, publishedAt: typeof w.publication_year === "number" ? String(w.publication_year) : undefined, summary: typeof w.cited_by_count === "number" ? `Cited ${w.cited_by_count} times` : undefined, access: oa.is_oa === true ? "Open access" : "May need a subscription at the publisher" }];
  }),
};

/** Which providers answer for which Fresh Flow system. */
export const SYSTEM_PROVIDERS: Record<string, Provider[]> = {
  "fresh-news": [gdelt],
  "fresh-music": [itunes],
  "books-reading": [openLibrary, gutendex],
  learn: [wikiversity, wikibooks],
  "research-knowledge": [openAlex, wikipedia],
};
export const isGlobalSystem = (systemId: string): boolean => Object.prototype.hasOwnProperty.call(SYSTEM_PROVIDERS, systemId);

export const MIN_QUERY = 2;
export const MAX_QUERY = 120;

export type ProviderReport = { id: string; label: string; ok: boolean; count: number; error?: string };
export type DiscoveryResult = { systemId: string; query: string; items: DiscoveryItem[]; providers: ProviderReport[] };
export type Fetcher = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export function cleanQuery(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY) : "";
}

/** Asks every provider for the system at once. One slow or broken provider never hides the others, and every failure is reported. */
export async function discover(systemId: string, rawQuery: unknown, fetcher: Fetcher, options: { limit?: number; timeoutMs?: number; userAgent?: string } = {}): Promise<DiscoveryResult> {
  if (!isGlobalSystem(systemId)) throw new Error(`Unknown system: ${systemId}`);
  const providers = SYSTEM_PROVIDERS[systemId];
  const query = cleanQuery(rawQuery);
  if (query.length < MIN_QUERY) throw new Error(`Type at least ${MIN_QUERY} characters to search.`);
  const limit = options.limit ?? 10, timeoutMs = options.timeoutMs ?? 8000;
  const settled = await Promise.all(providers.map(async (p) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetcher(p.request(query, limit), { signal: controller.signal, headers: { accept: "application/json", "user-agent": options.userAgent ?? "FreshFlow/1.0 (open catalog search)" } });
      if (!res.ok) return { report: { id: p.id, label: p.label, ok: false, count: 0, error: `${p.label} answered HTTP ${res.status}.` }, items: [] as DiscoveryItem[] };
      const items = p.parse(await res.json());
      return { report: { id: p.id, label: p.label, ok: true, count: items.length }, items };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return { report: { id: p.id, label: p.label, ok: false, count: 0, error: aborted ? `${p.label} took too long.` : `${p.label} could not be reached.` }, items: [] as DiscoveryItem[] };
    } finally { clearTimeout(timer); }
  }));
  // Interleave providers so one catalog does not push the other off the page; drop repeats of the same address.
  const lists = settled.map((s) => s.items), seen = new Set<string>(), items: DiscoveryItem[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) { const it = l[i]; if (it && !seen.has(it.url)) { seen.add(it.url); items.push(it); } }
  return { systemId, query, items, providers: settled.map((s) => s.report) };
}
