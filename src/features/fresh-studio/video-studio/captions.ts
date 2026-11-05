/**
 * Captions (spec §6.8). Cue model, SRT/WebVTT import and export, and remapping of cues
 * through timeline edits so captions stay in sync after cuts and speed changes.
 * Speech-to-text itself needs a real model backend; see TRANSCRIPTION_PROVIDERS below.
 */
import { clipDuration, round3, type TimelineDoc } from "./timeline.ts";

export type Cue = { id: string; start: number; end: number; text: string; speaker?: string };

export const MAX_CUES = 5000;
export const MAX_CUE_TEXT = 200;
const MIN_CUE_SECONDS = 0.05;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function formatTimestamp(seconds: number, separator: "," | "."): string {
  const total = Math.max(0, Math.round(seconds * 1000));
  const ms = total % 1000;
  const s = Math.floor(total / 1000) % 60;
  const m = Math.floor(total / 60000) % 60;
  const h = Math.floor(total / 3600000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(ms, 3)}`;
}

function parseTimestamp(raw: string): number | null {
  const m = raw.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})$/);
  if (!m) return null;
  const ms = Number(m[4].padEnd(3, "0"));
  return round3(Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + ms / 1000);
}

const TIME_LINE = /^\s*([\d:.,]+)\s*-->\s*([\d:.,]+)/;
const clean = (text: string) => text.replace(/<[^>]+>/g, "").replace(/\{\\[^}]*\}/g, "").trim();

export type ParseResult = { cues: Cue[]; skipped: number };

/** Tolerant parser for SRT and WebVTT: BOM, CRLF, missing indexes, cue settings and NOTE blocks. */
export function parseCaptions(source: string): ParseResult {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const blocks = text.split(/\n{2,}/);
  const cues: Cue[] = [];
  let skipped = 0;
  for (const block of blocks) {
    const lines = block.split("\n").filter((l, i) => !(i === 0 && /^WEBVTT/.test(l)));
    const at = lines.findIndex((l) => TIME_LINE.test(l));
    if (at < 0) { if (lines.some((l) => l.trim() && !/^(NOTE|STYLE|REGION)\b/.test(l) && !/^\d+$/.test(l.trim()))) skipped += 1; continue; }
    const t = lines[at].match(TIME_LINE)!;
    const start = parseTimestamp(t[1]);
    const end = parseTimestamp(t[2]);
    const body = clean(lines.slice(at + 1).join("\n"));
    if (start === null || end === null || end - start < MIN_CUE_SECONDS || !body) { skipped += 1; continue; }
    if (cues.length >= MAX_CUES) { skipped += 1; continue; }
    const speaker = body.match(/^([^\n:]{1,30}):\s/)?.[1];
    cues.push({ id: `cue-${cues.length + 1}`, start, end, text: body.slice(0, MAX_CUE_TEXT * 2), ...(speaker ? { speaker } : {}) });
  }
  return { cues: normalizeCues(cues), skipped };
}

export function normalizeCues(cues: Cue[]): Cue[] {
  return [...cues].sort((a, b) => a.start - b.start || a.end - b.end).map((c, i) => ({ ...c, id: c.id || `cue-${i + 1}` }));
}

export function serializeSrt(cues: Cue[]): string {
  return normalizeCues(cues).map((c, i) => `${i + 1}\n${formatTimestamp(c.start, ",")} --> ${formatTimestamp(c.end, ",")}\n${c.text}`).join("\n\n") + (cues.length ? "\n" : "");
}

export function serializeVtt(cues: Cue[]): string {
  const body = normalizeCues(cues).map((c) => `${formatTimestamp(c.start, ".")} --> ${formatTimestamp(c.end, ".")}\n${c.text}`).join("\n\n");
  return `WEBVTT\n\n${body}${cues.length ? "\n" : ""}`;
}

export type CueIssue = { cueId: string; message: string };

export function validateCues(cues: Cue[]): CueIssue[] {
  const issues: CueIssue[] = [];
  const sorted = normalizeCues(cues);
  sorted.forEach((c, i) => {
    if (!(c.end > c.start)) issues.push({ cueId: c.id, message: "Ends before it starts." });
    if (!c.text.trim()) issues.push({ cueId: c.id, message: "Has no text." });
    if (c.text.length > MAX_CUE_TEXT) issues.push({ cueId: c.id, message: `Longer than ${MAX_CUE_TEXT} characters.` });
    if (i > 0 && c.start < sorted[i - 1].end - 1e-6) issues.push({ cueId: c.id, message: "Overlaps the previous caption." });
  });
  return issues;
}

/**
 * Maps cues written against an asset's own time to the edited timeline.
 * A cue that crosses a cut becomes one cue per surviving piece; parts that were cut away disappear.
 */
export function remapCuesToTimeline(doc: TimelineDoc, assetId: string, cues: Cue[]): Cue[] {
  const clips = doc.clips.filter((c) => c.assetId === assetId && doc.tracks.find((t) => t.id === c.trackId)?.kind === "video");
  const out: Cue[] = [];
  for (const cue of cues) {
    let part = 0;
    for (const clip of clips) {
      const s = Math.max(cue.start, clip.sourceIn);
      const e = Math.min(cue.end, clip.sourceOut);
      if (e - s <= 0) continue;
      const start = round3(clip.start + (s - clip.sourceIn) / clip.speed);
      const end = round3(clip.start + (e - clip.sourceIn) / clip.speed);
      if (end - start < MIN_CUE_SECONDS || end - start > clipDuration(clip) + 1e-6) continue;
      out.push({ ...cue, id: `${cue.id}${part ? `-${part + 1}` : ""}`, start, end });
      part += 1;
    }
  }
  return normalizeCues(out);
}

/** Contract for a speech-to-text backend. None is connected today, and the UI must say so. */
export interface TranscriptionProvider {
  readonly id: string;
  readonly name: string;
  /** BCP-47 language tags this provider has been verified for. */
  readonly languages: readonly string[];
  transcribe(input: { mediaUrl: string; language?: string }): Promise<{ cues: Cue[]; language: string }>;
}

export const TRANSCRIPTION_PROVIDERS: readonly TranscriptionProvider[] = [];

export type TranscriptionStatus = { available: false; reason: string } | { available: true; providers: readonly TranscriptionProvider[] };

export function getTranscriptionStatus(providers: readonly TranscriptionProvider[] = TRANSCRIPTION_PROVIDERS): TranscriptionStatus {
  if (providers.length === 0) {
    return { available: false, reason: "Automatic captions need a speech-to-text service, which is not connected yet. You can import an SRT or VTT file now." };
  }
  return { available: true, providers };
}

/** Escapes a file path for use inside an ffmpeg filter argument. */
export function escapeFilterPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/([:'[\],;])/g, "\\$1");
}
