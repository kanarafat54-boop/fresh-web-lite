import type { ContentParser, FetchedResource, ParsedDocument, ParsedPassage } from "./contracts.js";
import { canonicalizeUrl } from "./url.js";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const cp = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function metaContent(html: string, attr: "name" | "property" | "http-equiv", key: string): string | null {
  const re = new RegExp(`<meta\\b[^>]*\\b${attr}\\s*=\\s*["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag?.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? null;
}

export function splitPassages(text: string, maxChars = 600): ParsedPassage[] {
  const passages: ParsedPassage[] = [];
  let cursor = 0;
  for (const block of text.split(/\n{1,}/)) {
    const start = text.indexOf(block, cursor);
    cursor = start + block.length;
    if (!block.trim()) continue;
    let offset = 0;
    const sentences = block.match(/[^.!?。！？]+[.!?。！？]*\s*/g) ?? [block];
    let buf = ""; let bufStart = 0;
    const flush = () => {
      const t = buf.trim();
      if (t.length >= 20) passages.push({ ordinal: passages.length, text: t, startOffset: start + bufStart, endOffset: start + bufStart + buf.length });
      buf = "";
    };
    for (const s of sentences) {
      if (buf && buf.length + s.length > maxChars) flush();
      if (!buf) bufStart = offset;
      buf += s; offset += s.length;
    }
    flush();
  }
  return passages;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => t.length > 1 || /\p{Script=Han}/u.test(t));
}

export class HtmlContentParser implements ContentParser {
  parse(resource: FetchedResource): ParsedDocument {
    const html = resource.body;
    const robotsMeta = metaContent(html, "name", "robots") ?? "";
    const noindex = /\bnoindex\b|\bnone\b/i.test(robotsMeta);
    const linkCanonical = html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i)?.[0]?.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    const canonicalUrl = canonicalizeUrl(linkCanonical ?? resource.finalUrl, resource.finalUrl) ?? canonicalizeUrl(resource.finalUrl) ?? resource.finalUrl;
    const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim());
    const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1] ?? metaContent(html, "http-equiv", "content-language");
    const published = metaContent(html, "property", "article:published_time") ?? html.match(/<time\b[^>]*datetime\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;
    const publishedAt = published && !Number.isNaN(Date.parse(published)) ? new Date(published).toISOString() : null;

    const outlinks = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)]
      .filter((m) => !/rel\s*=\s*["'][^"']*nofollow/i.test(m[0]))
      .map((m) => canonicalizeUrl(decode(m[1]), resource.finalUrl))
      .filter((u): u is string => Boolean(u));

    const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html)
      .replace(/<(script|style|noscript|template|svg|iframe)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br|blockquote)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ");
    const text = decode(body).split("\n").map((l) => l.replace(/[ \t\f\v\u00a0]+/g, " ").trim()).filter(Boolean).join("\n");
    return { canonicalUrl, title, language: lang ? lang.toLowerCase() : null, publishedAt, text, contentHash: "", passages: splitPassages(text), outlinks: [...new Set(outlinks)], noindex };
  }
}
