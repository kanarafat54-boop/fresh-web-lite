/**
 * Audio editing for Studio audio and podcast projects. Everything here is pure (plain arrays in, plain arrays out), so the
 * same numbers drive the preview, the export and the saved project, and Node tests can check the real samples.
 * Edits live in the project's settings (whole numbers, so milliseconds and decibels); the recording itself stays on this device.
 */
import type { StudioSettings } from "../shared/types.ts";

export const MAX_MARKERS = 200;
export const MAX_AUDIO_SECONDS = 30 * 60;
export const TARGET_PEAK_DB = -1;

export type Marker = { ms: number; name: string };
export type AudioEdit = { trimStartMs: number; trimEndMs: number; fadeInMs: number; fadeOutMs: number; gainDb: number; normalize: boolean; markers: Marker[] };
export const DEFAULT_EDIT: AudioEdit = { trimStartMs: 0, trimEndMs: 0, fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false, markers: [] };
/** trimEndMs of 0 means "to the end of the recording". */
export const EDIT_LIMITS = { fadeMs: [0, 10_000], gainDb: [-24, 24] } as const;

const clampInt = (v: unknown, lo: number, hi: number, fallback: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback; };

export function parseMarkers(raw: unknown): Marker[] {
  if (typeof raw !== "string" || !raw) return [];
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(data)) return [];
  const out: Marker[] = [];
  for (const m of data.slice(0, MAX_MARKERS)) {
    if (!m || typeof m !== "object") continue;
    const ms = Number((m as Marker).ms), name = String((m as Marker).name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (Number.isFinite(ms) && ms >= 0 && ms <= MAX_AUDIO_SECONDS * 1000) out.push({ ms: Math.round(ms), name: name || "Chapter" });
  }
  return out.sort((a, b) => a.ms - b.ms);
}
export const serializeMarkers = (markers: readonly Marker[]): string => JSON.stringify(parseMarkers(JSON.stringify(markers)));

/** Reads an edit from project settings; anything missing or out of range falls back safely. Older projects have none. */
export function readAudioEdit(settings: StudioSettings | Record<string, unknown>): AudioEdit {
  const s = settings as Record<string, unknown>;
  return {
    trimStartMs: clampInt(s.trimStartMs, 0, MAX_AUDIO_SECONDS * 1000, 0),
    trimEndMs: clampInt(s.trimEndMs, 0, MAX_AUDIO_SECONDS * 1000, 0),
    fadeInMs: clampInt(s.fadeInMs, EDIT_LIMITS.fadeMs[0], EDIT_LIMITS.fadeMs[1], 0),
    fadeOutMs: clampInt(s.fadeOutMs, EDIT_LIMITS.fadeMs[0], EDIT_LIMITS.fadeMs[1], 0),
    gainDb: clampInt(s.gainDb, EDIT_LIMITS.gainDb[0], EDIT_LIMITS.gainDb[1], 0),
    normalize: s.normalize === 1 || s.normalize === "1" || s.normalize === true,
    markers: parseMarkers(s.markers),
  };
}
export function toSettings(e: AudioEdit): Record<string, string | number> {
  return { trimStartMs: e.trimStartMs, trimEndMs: e.trimEndMs, fadeInMs: e.fadeInMs, fadeOutMs: e.fadeOutMs, gainDb: e.gainDb, normalize: e.normalize ? 1 : 0, markers: serializeMarkers(e.markers) };
}

/** The kept range in samples for a recording of `length` samples. */
export function keptRange(e: AudioEdit, length: number, rate: number): { from: number; to: number } {
  const from = Math.min(length, Math.round((e.trimStartMs / 1000) * rate));
  const to = e.trimEndMs > 0 ? Math.min(length, Math.round((e.trimEndMs / 1000) * rate)) : length;
  return { from, to: Math.max(from, to) };
}
export const keptSeconds = (e: AudioEdit, length: number, rate: number) => { const r = keptRange(e, length, rate); return (r.to - r.from) / rate; };

/** Applies trim, gain, normalising and fades. Returns new arrays; the input is left alone. Samples never leave -1..1. */
export function processChannels(channels: readonly Float32Array[], rate: number, e: AudioEdit): Float32Array[] {
  if (channels.length === 0) return [];
  const { from, to } = keptRange(e, channels[0].length, rate);
  const n = to - from;
  const out = channels.map((c) => c.slice(from, to));
  let gain = Math.pow(10, e.gainDb / 20);
  if (e.normalize && n > 0) {
    let peak = 0;
    for (const c of out) for (let i = 0; i < n; i++) { const a = Math.abs(c[i]); if (a > peak) peak = a; }
    if (peak > 1e-6) gain *= Math.pow(10, TARGET_PEAK_DB / 20) / peak;
  }
  const fi = Math.min(n, Math.round((e.fadeInMs / 1000) * rate)), fo = Math.min(n, Math.round((e.fadeOutMs / 1000) * rate));
  for (const c of out) {
    for (let i = 0; i < n; i++) {
      let g = gain;
      if (i < fi) g *= i / fi;
      if (i >= n - fo) g *= (n - 1 - i) / fo;
      const v = c[i] * g;
      c[i] = v > 1 ? 1 : v < -1 ? -1 : v;
    }
  }
  return out;
}

/** Where the sound starts and ends, ignoring quiet at both ends. Null when the whole recording is quiet. */
export function audibleRangeMs(channels: readonly Float32Array[], rate: number, thresholdDb = -45, paddingMs = 150): { startMs: number; endMs: number } | null {
  if (channels.length === 0) return null;
  const len = channels[0].length, frame = Math.max(1, Math.round(rate * 0.02)), limit = Math.pow(10, thresholdDb / 20);
  const loud = (f: number) => { let e = 0, k = 0; for (const c of channels) for (let i = f * frame; i < Math.min(len, (f + 1) * frame); i++) { e += c[i] * c[i]; k++; } return k > 0 && Math.sqrt(e / k) >= limit; };
  const frames = Math.floor(len / frame);
  let first = -1, last = -1;
  for (let f = 0; f < frames; f++) if (loud(f)) { if (first < 0) first = f; last = f; }
  if (first < 0) return null;
  const startMs = Math.max(0, Math.round((first * frame * 1000) / rate) - paddingMs);
  const endMs = Math.min(Math.round((len * 1000) / rate), Math.round(((last + 1) * frame * 1000) / rate) + paddingMs);
  return { startMs, endMs };
}

/** Loudest sample in each of `buckets` equal slices, for drawing the waveform. */
export function waveformPeaks(channels: readonly Float32Array[], buckets: number): Float32Array {
  const out = new Float32Array(Math.max(1, buckets));
  if (channels.length === 0 || channels[0].length === 0) return out;
  const len = channels[0].length, step = len / out.length;
  for (let b = 0; b < out.length; b++) {
    let peak = 0;
    const a = Math.floor(b * step), z = Math.max(a + 1, Math.floor((b + 1) * step));
    const stride = Math.max(1, Math.floor((z - a) / 64));
    for (const c of channels) for (let i = a; i < z && i < len; i += stride) { const v = Math.abs(c[i]); if (v > peak) peak = v; }
    out[b] = peak;
  }
  return out;
}

/** 16-bit PCM WAV bytes. */
export function encodeWav(channels: readonly Float32Array[], rate: number): Uint8Array {
  const ch = channels.length, len = ch ? channels[0].length : 0;
  if (ch === 0 || ch > 2) throw new Error("Only mono and stereo audio can be exported.");
  const bytes = len * ch * 2, buf = new ArrayBuffer(44 + bytes), v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + bytes, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, bytes, true);
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, channels[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Uint8Array(buf);
}

const pad = (n: number) => String(n).padStart(2, "0");
export function formatClock(ms: number): string { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`; }

/** Markers moved to the exported file's own time (after trimming); markers outside the kept range are dropped. */
export function markersInExport(e: AudioEdit, length: number, rate: number): Marker[] {
  const { from, to } = keptRange(e, length, rate);
  const fromMs = (from * 1000) / rate, toMs = (to * 1000) / rate;
  return parseMarkers(JSON.stringify(e.markers)).filter((m) => m.ms >= fromMs && m.ms < toMs).map((m) => ({ ms: Math.round(m.ms - fromMs), name: m.name }));
}
/** Podcasting 2.0 chapters file (https://github.com/Podcastindex-org/podcast-namespace/blob/main/chapters/jsonChapters.md). */
export function chaptersJson(markers: readonly Marker[]): string {
  const list = markers.length && markers[0].ms > 0 ? [{ ms: 0, name: "Start" }, ...markers] : [...markers];
  return JSON.stringify({ version: "1.2.0", chapters: list.map((m) => ({ startTime: Math.round(m.ms / 1000), title: m.name })) }, null, 2);
}
/** Plain "00:01:30 Name" lines, the format most players and show-note editors accept. */
export const chaptersText = (markers: readonly Marker[]): string => markers.map((m) => `${formatClock(m.ms)} ${m.name}`).join("\n");

export function exportFileName(projectName: string, ext: string): string {
  const base = (projectName || "audio").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "audio";
  return `fresh-studio-${base}.${ext}`;
}
