/**
 * Global discovery: open public catalogs that Fresh Flow systems can search beyond Fresh itself.
 * Each provider builds a request and turns the reply into one shape. Fresh links to the original source and never copies full works.
 * All providers here are free and need no key. Nothing in this file touches the network: the caller passes in a fetcher.
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
  /** Default "json". Feeds are "xml": they are read as text and parse() receives a string. */
  format?: "json" | "xml";
  parse: (payload: unknown) => DiscoveryItem[];
  /** Providers that share a group are reported as one source, for example "Publisher feeds". */
  group?: string;
  /** The source has no search of its own: it returns its latest items and Fresh keeps the ones that match the words typed. */
  filtersLocally?: boolean;
  /** Cannot answer without words to search for, so it is skipped when only browsing. */
  needsQuery?: boolean;
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

const fromCodePoint = (n: number): string => { try { return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ""; } catch { return ""; } };
/** Decodes the usual entities once. &amp; goes last so that &amp;lt; stays the text "&lt;". */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
/** Removes real tags and comments only, so text like "x < y and z > w" survives. */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?[a-zA-Z][^>]*>/g, "")).replace(/\s+/g, " ").trim();
}
/** GDELT dates look like 20261117T093000Z. */
export function gdeltDate(value: string): string | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : undefined;
}
const enc = encodeURIComponent;
const clamp = (n: number) => Math.max(1, Math.min(25, Math.floor(n)));

export const gdelt: Provider = {
  id: "gdelt", label: "GDELT news index", kind: "news", needsQuery: true,
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

/** Lucene operators in the Internet Archive search would turn a plain phrase into a syntax error. */
const plainWords = (q: string): string => q.replace(/[+\-!(){}[\]^"~*?:\\/]/g, " ").replace(/\s+/g, " ").trim();

export const internetArchive: Provider = {
  id: "internetarchive", label: "Internet Archive", kind: "book",
  request: (q, n) => `https://archive.org/advancedsearch.php?q=${enc(`(${plainWords(q)}) AND mediatype:texts`)}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=year&rows=${clamp(n)}&output=json`,
  parse: (payload) => arr(obj(obj(payload).response).docs).flatMap((raw) => {
    const d = obj(raw), id = str(d.identifier), title = str(Array.isArray(d.title) ? d.title[0] : d.title);
    if (!title || !/^[\w.-]+$/.test(id)) return [];
    const creators = (Array.isArray(d.creator) ? d.creator : [d.creator]).map(str).filter(Boolean);
    const year = String(d.year ?? "").slice(0, 4);
    return [{ id: `ia:${id}`, kind: "book" as const, title, creator: creators.slice(0, 3).join("; ") || undefined, source: "Internet Archive", url: `https://archive.org/details/${id}`, publishedAt: /^\d{4}$/.test(year) ? year : undefined, imageUrl: `https://archive.org/services/img/${id}`, access: "Free to read or borrow at the Internet Archive" }];
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

// ---- Publisher feeds (RSS, Atom, RDF) -------------------------------------------------------------------------------
const CDATA = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/;
/** Text of an XML element. CDATA is taken as written; escaped markup is decoded first, then tags are removed. */
function xmlText(raw: string): string {
  const wrapped = CDATA.exec(raw);
  return wrapped ? stripHtml(wrapped[1]) : stripHtml(decodeEntities(raw));
}
/** Lower-cases ASCII only, so every index in the copy still points at the same place in the original. */
const asciiLower = (text: string): string => text.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));

/** Inner text of the first <name>...</name> in a block. Found with indexOf, so a broken or hostile feed cannot make it slow. */
function tagBody(block: string, name: string): string | undefined {
  const low = asciiLower(block), tag = asciiLower(name), close = `</${tag}>`;
  let from = 0;
  while (from < low.length) {
    const open = low.indexOf(`<${tag}`, from);
    if (open < 0) return undefined;
    const after = low.charAt(open + tag.length + 1);
    if (after !== ">" && !/\s/.test(after)) { from = open + 1; continue; } // a longer name such as <linkage>
    const end = low.indexOf(">", open);
    if (end < 0) return undefined;
    if (low.charAt(end - 1) === "/") { from = end + 1; continue; } // self-closing, no body
    const stop = low.indexOf(close, end + 1);
    return stop < 0 ? undefined : block.slice(end + 1, stop);
  }
  return undefined;
}

/** The inside of each <item> or <entry>, one pass through the feed. An item that never closes ends the scan. */
function* feedBlocks(xml: string): Generator<string> {
  const low = asciiLower(xml), open = /<(item|entry)\b[^>]{0,400}>/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(low)) !== null) {
    const stop = low.indexOf(`</${m[1]}>`, open.lastIndex);
    if (stop < 0) return;
    yield xml.slice(open.lastIndex, stop);
    open.lastIndex = stop;
  }
}
function attributes(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? "");
  return out;
}
function itemLink(block: string): string | undefined {
  // Atom: <link rel="alternate" href="..."/>   RSS and RDF: <link>https://...</link>
  for (const m of block.matchAll(/<link\b([^>]{0,600})>/gi)) {
    const a = attributes(m[1]);
    if (a.href && (!a.rel || a.rel === "alternate")) { const u = safeUrl(a.href); if (u) return u; }
  }
  for (const name of ["link", "guid"]) {
    const body = tagBody(block, name);
    const u = body ? safeUrl(xmlText(body)) : undefined;
    if (u) return u;
  }
  return undefined;
}
function itemImage(block: string): string | undefined {
  for (const m of block.matchAll(/<(enclosure|media:thumbnail|media:content)\b([^>]{0,600})>/gi)) {
    const a = attributes(m[2]);
    if (m[1].toLowerCase() === "media:thumbnail" || (a.type ?? "").startsWith("image/") || a.medium === "image") { const u = secure(a.url); if (u) return u; }
  }
  return undefined;
}
function itemDate(block: string): string | undefined {
  for (const name of ["pubDate", "published", "updated", "dc:date"]) {
    const body = tagBody(block, name);
    const t = body ? Date.parse(xmlText(body)) : NaN;
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return undefined;
}
const MAX_FEED_CHARS = 1_000_000;
/** Reads the items of an RSS 2.0, Atom or RDF feed. Items without a title or a web address are skipped. */
export function parseFeed(xml: unknown, publisher: string, kind: DiscoveryKind = "news", maxItems = 40): DiscoveryItem[] {
  if (typeof xml !== "string") return [];
  const out: DiscoveryItem[] = [];
  for (const block of feedBlocks(xml.slice(0, MAX_FEED_CHARS))) {
    if (out.length >= maxItems) break;
    const title = xmlText(tagBody(block, "title") ?? "");
    const url = itemLink(block);
    if (!title || !url) continue;
    const summaryRaw = tagBody(block, "description") ?? tagBody(block, "summary") ?? tagBody(block, "content");
    const summary = summaryRaw ? xmlText(summaryRaw).slice(0, 240) : "";
    out.push({ id: `rss:${url}`, kind, title, source: publisher, url, publishedAt: itemDate(block), summary: summary || undefined, imageUrl: itemImage(block), access: "Opens at the publisher" });
  }
  return out;
}

const FEED_GROUP = "Publisher feeds";
function feed(id: string, label: string, url: string): Provider {
  return { id, label, kind: "news", format: "xml", group: FEED_GROUP, filtersLocally: true, request: () => url, parse: (xml) => parseFeed(xml, label) };
}
/** Public world and Africa news feeds that publishers offer for readers and aggregators. Each is a one-line change to add or remove. */
export const NEWS_FEEDS: Provider[] = [
  feed("bbc-world", "BBC News", "https://feeds.bbci.co.uk/news/world/rss.xml"),
  feed("bbc-africa", "BBC News Africa", "https://feeds.bbci.co.uk/news/world/africa/rss.xml"),
  feed("aljazeera", "Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
  feed("dw", "DW", "https://rss.dw.com/xml/rss-en-top"),
  feed("france24", "France 24", "https://www.france24.com/en/rss"),
  feed("npr-world", "NPR", "https://feeds.npr.org/1004/rss.xml"),
  feed("guardian-world", "The Guardian", "https://www.theguardian.com/world/rss"),
  feed("allafrica", "allAfrica", "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf"),
];

/** Which providers answer for which Fresh Flow system. */
export const SYSTEM_PROVIDERS: Record<string, Provider[]> = {
  "fresh-news": [...NEWS_FEEDS, gdelt],
  "fresh-music": [itunes],
  "books-reading": [openLibrary, internetArchive],
  learn: [wikiversity, wikibooks],
  "research-knowledge": [openAlex, wikipedia],
};
/** Systems that show something before anything is typed. */
const BROWSABLE = new Set(["fresh-news"]);
export const isBrowsable = (systemId: string): boolean => BROWSABLE.has(systemId);
/** News is shown newest first; the other systems interleave their catalogs. */
const NEWEST_FIRST = new Set(["fresh-news"]);
const NEWS_CAP = 30;
export const isGlobalSystem = (systemId: string): boolean => Object.prototype.hasOwnProperty.call(SYSTEM_PROVIDERS, systemId);

export const MIN_QUERY = 2;
export const MAX_QUERY = 120;

export type ProviderReport = { id: string; label: string; ok: boolean; count: number; error?: string; note?: string };
export type DiscoveryResult = { systemId: string; query: string; items: DiscoveryItem[]; providers: ProviderReport[] };
export type Fetcher = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

export function cleanQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Control characters become spaces. A character-class regex for them trips the no-control-regex lint rule, so check code points.
  let text = "";
  for (const ch of raw) { const code = ch.codePointAt(0) ?? 0; text += code < 32 || code === 127 ? " " : ch; }
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
}

const words = (text: string): string => ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`;
/** Keeps items whose title or summary has a word starting with every word typed. */
export function matchesWords(items: DiscoveryItem[], query: string): DiscoveryItem[] {
  const wanted = words(query).trim().split(" ").filter(Boolean);
  if (wanted.length === 0) return items;
  return items.filter((item) => { const hay = words(`${item.title} ${item.summary ?? ""}`); return wanted.every((w) => hay.includes(` ${w}`)); });
}

export const USER_AGENT = "FreshFlow/1.0 (open catalog search)";
export const FEED_ACCEPT = "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5";
const slug = (label: string): string => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const time = (item: DiscoveryItem): number => { const t = Date.parse(item.publishedAt ?? ""); return Number.isNaN(t) ? -Infinity : t; };

type Settled = { report: ProviderReport; items: DiscoveryItem[] };

/**
 * Asks every provider for the system at once. One slow or broken provider never hides the others, and every failure is reported.
 * Systems that can be browsed (news) answer an empty query with their latest items.
 */
export async function discover(systemId: string, rawQuery: unknown, fetcher: Fetcher, options: { limit?: number; timeoutMs?: number; userAgent?: string } = {}): Promise<DiscoveryResult> {
  if (!isGlobalSystem(systemId)) throw new Error(`Unknown system: ${systemId}`);
  const query = cleanQuery(rawQuery);
  const browsing = query === "" && isBrowsable(systemId);
  if (!browsing && query.length < MIN_QUERY) throw new Error(`Type at least ${MIN_QUERY} characters to search.`);
  const providers = SYSTEM_PROVIDERS[systemId].filter((p) => !(browsing && p.needsQuery));
  const limit = options.limit ?? 10, timeoutMs = options.timeoutMs ?? 8000;
  const settled: Settled[] = await Promise.all(providers.map(async (p): Promise<Settled> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const failed = (error: string): Settled => ({ report: { id: p.id, label: p.label, ok: false, count: 0, error }, items: [] });
    try {
      const xml = p.format === "xml";
      const res = await fetcher(p.request(query, limit), { signal: controller.signal, headers: { accept: xml ? FEED_ACCEPT : "application/json", "user-agent": options.userAgent ?? USER_AGENT } });
      if (!res.ok) return failed(`${p.label} answered HTTP ${res.status}.`);
      let payload: unknown;
      if (xml) {
        const text = await res.text();
        // A bot-check or error page that still says 200 must not pass for an empty feed.
        if (!/<(item|entry)\b/i.test(text)) return failed(`${p.label} did not return a feed.`);
        payload = text;
      } else payload = await res.json();
      let items = p.parse(payload);
      if (p.filtersLocally) items = matchesWords(items, query).slice(0, limit);
      return { report: { id: p.id, label: p.label, ok: true, count: items.length }, items };
    } catch (error) {
      return failed(error instanceof Error && error.name === "AbortError" ? `${p.label} took too long.` : `${p.label} could not be reached.`);
    } finally { clearTimeout(timer); }
  }));

  // Sources in a group (the publisher feeds) are reported as one line: failed only if none answered, with a note if some did not.
  const reports: ProviderReport[] = [];
  const groups = new Map<string, { at: number; members: ProviderReport[] }>();
  settled.forEach((s, i) => {
    const group = providers[i].group;
    if (!group) { reports.push(s.report); return; }
    let entry = groups.get(group);
    if (!entry) { entry = { at: reports.length, members: [] }; groups.set(group, entry); reports.push(s.report); }
    entry.members.push(s.report);
  });
  for (const [label, { at, members }] of groups) {
    const answered = members.filter((m) => m.ok), missing = members.filter((m) => !m.ok);
    reports[at] = answered.length === 0
      ? { id: slug(label), label, ok: false, count: 0, error: `None of the ${members.length} ${label.toLowerCase()} answered.` }
      : { id: slug(label), label, ok: true, count: members.reduce((n, m) => n + m.count, 0), ...(missing.length ? { note: `${missing.length} of ${members.length} ${label.toLowerCase()} did not answer: ${missing.map((m) => m.label).join(", ")}.` } : {}) };
  }

  const lists = settled.map((s) => s.items), seen = new Set<string>();
  let items: DiscoveryItem[] = [];
  if (NEWEST_FIRST.has(systemId)) {
    for (const list of lists) for (const it of list) if (!seen.has(it.url)) { seen.add(it.url); items.push(it); }
    items.sort((a, b) => { const d = time(b) - time(a); return Number.isNaN(d) ? 0 : d; });
    items = items.slice(0, NEWS_CAP);
  } else {
    // Interleave providers so one catalog does not push the other off the page; drop repeats of the same address.
    for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) { const it = l[i]; if (it && !seen.has(it.url)) { seen.add(it.url); items.push(it); } }
  }
  return { systemId, query, items, providers: reports };
}
