/** Pure helpers for the Studio writing editor (posts, news, books, lessons, research and similar text work). */
import type { StudioSettings } from "../shared/types.ts";

export const MAX_TITLE = 200;
export const MAX_BODY = 30_000;
export const MAX_SOURCES_TEXT = 4_000;
export const MAX_SOURCES = 30;
const WORDS_PER_MINUTE = 200;

export type Draft = { title: string; body: string; sources: string };
export type Source = { title: string; url: string };

export const readDraft = (settings: StudioSettings | undefined): Draft => {
  const text = (key: string, max: number) => (typeof settings?.[key] === "string" ? (settings[key] as string).slice(0, max) : "");
  return { title: text("draftTitle", MAX_TITLE), body: text("draftBody", MAX_BODY), sources: text("draftSources", MAX_SOURCES_TEXT) };
};
export const toSettings = (d: Draft): Record<string, string> => ({ draftTitle: d.title, draftBody: d.body, draftSources: d.sources });

export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}
export const readingMinutes = (words: number): number => (words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE)));

/** Headings are Markdown lines starting with 1 to 3 hashes. */
export function outline(body: string): { level: number; text: string }[] {
  const out: { level: number; text: string }[] = [];
  for (const line of body.split("\n")) {
    const m = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2] });
  }
  return out;
}

/** One source per line: "Title | https://address" or just an address. Only http(s) addresses are accepted. */
export function parseSources(text: string): { sources: Source[]; invalid: string[] } {
  const sources: Source[] = [], invalid: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bar = line.lastIndexOf("|");
    const title = bar >= 0 ? line.slice(0, bar).trim() : "";
    const address = (bar >= 0 ? line.slice(bar + 1) : line).trim();
    let ok = false;
    try { const u = new URL(address); ok = u.protocol === "https:" || u.protocol === "http:"; } catch { ok = false; }
    if (ok && sources.length < MAX_SOURCES) sources.push({ title: title || address, url: address }); else invalid.push(line);
  }
  return { sources, invalid };
}

export type Check = { ok: boolean; text: string };
/** Checks before sharing. Sources are required for systems whose capabilities include source attribution. */
export function preflight(d: Draft, needsSources: boolean): Check[] {
  const words = countWords(d.body), { sources, invalid } = parseSources(d.sources);
  const checks: Check[] = [
    { ok: d.title.trim().length > 0, text: "Has a title" },
    { ok: words >= 20, text: "Has at least 20 words of text" },
    { ok: invalid.length === 0, text: "Every source line is a web address" },
  ];
  if (needsSources) checks.push({ ok: sources.length > 0, text: "Names at least one source" });
  return checks;
}

const STARTERS: Record<string, string> = {
  "fresh-news": "## What happened\n\n## Why it matters\n\n## What is not yet known\n",
  "research-knowledge": "## Question\n\n## Method\n\n## Findings\n\n## Limits\n",
  learn: "## What you will learn\n\n## Lesson\n\n## Check yourself\n",
  "books-reading": "## Chapter 1\n\n",
  "fresh-posts": "",
  communities: "",
  "creator-channels": "## About this channel\n\n",
};
export const starterFor = (systemId: string | null | undefined): string => (systemId && STARTERS[systemId]) || "";

export function toMarkdown(d: Draft): string {
  const { sources } = parseSources(d.sources);
  const parts = [d.title.trim() ? `# ${d.title.trim()}` : "", d.body.trim()];
  if (sources.length) parts.push(["## Sources", ...sources.map((s) => `- [${s.title}](${s.url})`)].join("\n"));
  return parts.filter(Boolean).join("\n\n") + "\n";
}
export function toPlainText(d: Draft): string {
  const { sources } = parseSources(d.sources);
  const plain = d.body.replace(/^#{1,6}\s+/gm, "").replace(/(\*\*|__|\*|_|`)/g, "");
  const parts = [d.title.trim(), plain.trim()];
  if (sources.length) parts.push(["Sources", ...sources.map((s) => `${s.title}: ${s.url}`)].join("\n"));
  return parts.filter(Boolean).join("\n\n") + "\n";
}
export function exportFileName(title: string, ext: "md" | "txt"): string {
  const base = title.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `fresh-studio-${base || "draft"}.${ext}`;
}
