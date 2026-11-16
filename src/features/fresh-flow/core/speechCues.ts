import { MAX_CUE_TEXT, type CaptionCue } from "./shortsCaptions.ts";

export type SpeechSegment = { text: string; start: number; end: number };

const LINE = 42;
const MAX_CUE_SECONDS = 6;
const MIN_CUE_SECONDS = 0.8;

// Things speech models print for silence, music or noise. They are not words anyone said.
const NOISE_TAG = /^[\s♪♫🎵]*[\[(*][^\])*]{0,40}[\])*][\s♪♫🎵]*$/;
const HALLUCINATIONS = [/^thanks? for watching[.!]*$/i, /^thank you for watching[.!]*$/i, /^please subscribe[.!]*$/i, /^subtitles? by .*/i, /^amara\.org.*/i];

export function cleanSegmentText(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text || NOISE_TAG.test(text) || /^[♪♫\s.]+$/.test(text)) return "";
  if (HALLUCINATIONS.some((re) => re.test(text))) return "";
  return text;
}

/** Splits text into lines of at most `width` characters at word boundaries. */
export function wrapLines(text: string, width = LINE): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    if (!current) current = word;
    else if (current.length + 1 + word.length <= width) current += ` ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

/** Breaks one timed segment into readable cues (two lines at most), dividing its time by length. */
function splitSegment(segment: SpeechSegment): CaptionCue[] {
  const words = segment.text.split(" ");
  const pieces: string[] = [];
  let current: string[] = [];
  for (const word of words) {
    const candidate = [...current, word].join(" ");
    if (current.length > 0 && wrapLines(candidate).length > 2) { pieces.push(current.join(" ")); current = [word]; }
    else current.push(word);
  }
  if (current.length) pieces.push(current.join(" "));
  const total = pieces.reduce((n, p) => n + p.length, 0) || 1;
  const span = Math.max(segment.end - segment.start, 0.1);
  let cursor = segment.start;
  return pieces.map((piece) => {
    const share = (piece.length / total) * span;
    const cue = { start: cursor, end: cursor + share, text: wrapLines(piece).join("\n").slice(0, MAX_CUE_TEXT) };
    cursor += share;
    return cue;
  });
}

/**
 * Turns recognised segments into caption cues: removes noise tags and known silence hallucinations, drops a line the
 * model repeated three or more times in a row, splits long segments, keeps cues inside the video and in order, and
 * gives very short cues time to be read.
 */
export function cuesFromSpeech(segments: SpeechSegment[], durationSeconds: number): CaptionCue[] {
  const duration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : Infinity;
  const cleaned: SpeechSegment[] = [];
  for (const s of segments) {
    if (!Number.isFinite(s.start) || !Number.isFinite(s.end)) continue;
    const text = cleanSegmentText(s.text);
    if (!text) continue;
    const start = Math.max(0, Math.min(s.start, duration));
    const end = Math.min(Math.max(s.end, start + 0.1), duration);
    if (end <= start) continue;
    cleaned.push({ text, start, end });
  }
  cleaned.sort((a, b) => a.start - b.start);

  const deduped: SpeechSegment[] = [];
  let run = 0;
  for (const s of cleaned) {
    const prev = deduped[deduped.length - 1];
    run = prev && prev.text.toLowerCase() === s.text.toLowerCase() ? run + 1 : 0;
    if (run >= 2) continue;
    deduped.push(s);
  }

  const cues: CaptionCue[] = [];
  for (const s of deduped) for (const cue of splitSegment(s)) cues.push(cue);
  for (let i = 0; i < cues.length; i += 1) {
    const cue = cues[i];
    const next = cues[i + 1];
    let end = Math.min(cue.end, cue.start + MAX_CUE_SECONDS);
    if (end - cue.start < MIN_CUE_SECONDS) end = cue.start + MIN_CUE_SECONDS;
    if (next && end > next.start) end = Math.max(cue.start + 0.1, next.start);
    cue.end = Math.min(end, duration);
  }
  return cues.filter((c) => c.end > c.start && c.text.trim()).map((c) => ({ start: round(c.start), end: round(c.end), text: c.text }));
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Shape of what the on-device Whisper pipeline returns with timestamps on. A missing end means "until the next one starts". */
export function segmentsFromWhisper(output: unknown, totalSeconds: number): SpeechSegment[] {
  const chunks = (output as { chunks?: unknown } | null)?.chunks;
  if (!Array.isArray(chunks)) {
    const text = (output as { text?: unknown } | null)?.text;
    return typeof text === "string" && text.trim() && totalSeconds > 0 ? [{ text: text.trim(), start: 0, end: totalSeconds }] : [];
  }
  const raw: Array<{ text: string; start: number; end: number | null }> = [];
  for (const chunk of chunks) {
    const c = chunk as { text?: unknown; timestamp?: unknown };
    const ts = Array.isArray(c.timestamp) ? c.timestamp : [];
    if (typeof c.text !== "string" || typeof ts[0] !== "number" || !Number.isFinite(ts[0])) continue;
    raw.push({ text: c.text, start: ts[0], end: typeof ts[1] === "number" && Number.isFinite(ts[1]) ? ts[1] : null });
  }
  return raw.map((r, i) => ({ text: r.text, start: r.start, end: r.end ?? raw[i + 1]?.start ?? totalSeconds }));
}

export const SPEECH_LANGUAGES: Array<{ code: string; name: string }> = [
  { code: "en", name: "english" }, { code: "es", name: "spanish" }, { code: "fr", name: "french" }, { code: "de", name: "german" },
  { code: "pt", name: "portuguese" }, { code: "it", name: "italian" }, { code: "ar", name: "arabic" }, { code: "sw", name: "swahili" },
  { code: "hi", name: "hindi" }, { code: "tr", name: "turkish" }, { code: "ru", name: "russian" }, { code: "id", name: "indonesian" },
  { code: "ja", name: "japanese" }, { code: "ko", name: "korean" }, { code: "zh", name: "chinese" }, { code: "nl", name: "dutch" },
];
