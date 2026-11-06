/**
 * Captions for Fresh Shorts (specification 2.2 and Part 14).
 *
 * Captions come from the creator: a WebVTT or SRT file they upload for their own Short. Nothing here
 * generates captions; automatic captions need a speech-to-text service that does not exist yet, so the
 * player only shows captions that are real, stored and marked ready.
 *
 * Stored shape in `short_captions.segments`: [{ start, end, text }] with start and end in seconds.
 */
export type CaptionCue = { start: number; end: number; text: string };

export const MAX_CAPTION_FILE_BYTES = 512 * 1024;
export const MAX_CAPTION_CUES = 5000;
export const MAX_CUE_TEXT = 300;

/** Parses "00:01.500", "00:00:01.500" or "00:00:01,500" into seconds, or null. */
export function parseTimestamp(value: string): number | null {
  const m = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/.exec(value.trim());
  if (!m) return null;
  const hours = m[1] ? Number(m[1]) : 0;
  const ms = Number(m[4].padEnd(3, "0"));
  return hours * 3600 + Number(m[2]) * 60 + Number(m[3]) + ms / 1000;
}

function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\{\\[^}]*\}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_CUE_TEXT);
}

export type CaptionParseResult = { cues: CaptionCue[]; error: string | null };

/** Parses WebVTT or SRT text. Unknown or malformed blocks are skipped; an empty result is an error. */
export function parseCaptionFile(source: string): CaptionParseResult {
  if (typeof source !== "string" || !source.trim()) return { cues: [], error: "The caption file is empty." };
  if (source.length > MAX_CAPTION_FILE_BYTES) return { cues: [], error: "The caption file is too large (limit 512 KB)." };
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const looksLikeCaptions = /^WEBVTT/.test(text.trimStart()) || /-->/.test(text);
  if (!looksLikeCaptions) return { cues: [], error: "This does not look like a WebVTT or SRT caption file." };

  const cues: CaptionCue[] = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n");
    const at = lines.findIndex((line) => line.includes("-->"));
    if (at < 0) continue;
    const [rawStart, rest] = lines[at].split("-->");
    const rawEnd = (rest ?? "").trim().split(/\s+/)[0] ?? "";
    const start = parseTimestamp(rawStart);
    const end = parseTimestamp(rawEnd);
    if (start === null || end === null || end <= start) continue;
    const body = cleanText(lines.slice(at + 1).join("\n"));
    if (!body) continue;
    cues.push({ start, end, text: body });
    if (cues.length >= MAX_CAPTION_CUES) break;
  }
  if (!cues.length) return { cues: [], error: "No readable captions were found in this file." };
  cues.sort((a, b) => a.start - b.start);
  return { cues, error: null };
}

/** Validates stored segments of unknown shape; drops anything that is not a usable cue. */
export function normalizeCues(value: unknown): CaptionCue[] {
  if (!Array.isArray(value)) return [];
  const out: CaptionCue[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { start, end, text } = item as Record<string, unknown>;
    if (typeof start !== "number" || typeof end !== "number" || typeof text !== "string") continue;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) continue;
    const clean = text.trim().slice(0, MAX_CUE_TEXT);
    if (clean) out.push({ start, end, text: clean });
    if (out.length >= MAX_CAPTION_CUES) break;
  }
  return out.sort((a, b) => a.start - b.start);
}

/** The cue showing at `time` seconds, or null. Cues are sorted by start. */
export function activeCue(cues: CaptionCue[], time: number): CaptionCue | null {
  if (!cues.length || !Number.isFinite(time)) return null;
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= time) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  // Overlapping cues are rare; step back a few to find one that still covers `time`.
  for (let i = found; i >= 0 && i > found - 4; i -= 1) if (time < cues[i].end) return cues[i];
  return null;
}

export type CaptionTrack = { language: string; cues: CaptionCue[] };

/** Picks the track for the person's language, then English, then the first one available. */
export function pickTrack(tracks: CaptionTrack[], preferredLanguage: string): CaptionTrack | null {
  if (!tracks.length) return null;
  const base = (preferredLanguage || "en").toLowerCase().split("-")[0];
  return tracks.find((t) => t.language.toLowerCase().split("-")[0] === base)
    ?? tracks.find((t) => t.language.toLowerCase().startsWith("en"))
    ?? tracks[0];
}

export const CAPTIONS_PREF_KEY = "fresh-shorts-captions-on";
export function readCaptionsOn(): boolean {
  try { return localStorage.getItem(CAPTIONS_PREF_KEY) === "1"; } catch { return false; }
}
export function writeCaptionsOn(on: boolean): void {
  try { localStorage.setItem(CAPTIONS_PREF_KEY, on ? "1" : "0"); } catch { /* device storage unavailable */ }
}
