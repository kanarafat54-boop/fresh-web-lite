/**
 * Speech to captions and filler-word cutting. Everything here is pure: the speech engine (speechEngine.ts) produces
 * timed words, and these functions turn them into caption cues and cut ranges. Word times are in the SOURCE file's seconds.
 */
import type { Cue } from "./captions.ts";
import type { Range } from "./analysis.ts";
import type { TimelineClip } from "./timeline.ts";

export type Word = { text: string; start: number; end: number };

const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
/** Sounds that are hesitation, not words. Deliberately short: "like" or "you know" are real words and are never cut. */
export const FILLER_WORDS: readonly string[] = ["um", "umm", "uh", "uhh", "uhm", "er", "erm", "err", "ah", "ahh", "eh", "hm", "hmm", "hmmm", "mm", "mmm", "mhm"];
const FILLERS = new Set(FILLER_WORDS);

/** Cleans engine output: drops empty words, fixes times that go backwards and orders by start. */
export function cleanWords(words: readonly Word[]): Word[] {
  const out: Word[] = [];
  for (const w of [...words].sort((a, b) => a.start - b.start)) {
    const text = w.text.replace(/\s+/g, " ").trim();
    if (!text || !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.start < 0) continue;
    const prev = out[out.length - 1];
    const start = prev ? Math.max(w.start, prev.end) : w.start;
    out.push({ text, start, end: Math.max(w.end, start + 0.05) });
  }
  return out;
}

export type CueOptions = { maxChars?: number; maxSeconds?: number; maxGap?: number };
/** Groups words into readable captions: new cue after a long pause, a sentence end, or when a line gets too long. */
export function wordsToCues(words: readonly Word[], options: CueOptions = {}, makeId: () => string = () => `cue_${Math.random().toString(36).slice(2, 9)}`): Cue[] {
  const maxChars = options.maxChars ?? 38, maxSeconds = options.maxSeconds ?? 3.5, maxGap = options.maxGap ?? 0.6;
  const cues: Cue[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    const text = cur.map((w) => w.text).join(" ").replace(/\s+([,.!?;:])/g, "$1");
    cues.push({ id: makeId(), start: cur[0].start, end: cur[cur.length - 1].end, text: text.slice(0, 200) });
    cur = [];
  };
  for (const w of cleanWords(words)) {
    const last = cur[cur.length - 1];
    if (last) {
      const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
      if (w.start - last.end > maxGap || chars > maxChars || w.end - cur[0].start > maxSeconds || /[.!?]$/.test(last.text)) flush();
    }
    cur.push(w);
  }
  flush();
  return cues;
}

/** Words that are filler sounds. */
export function findFillers(words: readonly Word[]): Word[] {
  return cleanWords(words).filter((w) => FILLERS.has(norm(w.text)));
}

/** Source-time ranges to cut for the fillers, widened a hair to catch the breath around them and joined when they touch. */
export function fillerRanges(fillers: readonly Word[], options: { pad?: number } = {}): Range[] {
  const pad = options.pad ?? 0.04;
  const out: Range[] = [];
  for (const f of [...fillers].sort((a, b) => a.start - b.start)) {
    const r = { start: Math.max(0, f.start - pad), end: f.end + pad };
    const last = out[out.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end); else out.push(r);
  }
  return out;
}

/** Moves words that fall inside a clip's source window onto the timeline, following the clip's start and speed. Words cut off by the window are dropped. */
export function wordsOnTimeline(words: readonly Word[], clip: Pick<TimelineClip, "start" | "sourceIn" | "sourceOut" | "speed">): Word[] {
  const out: Word[] = [];
  for (const w of words) {
    if (w.start < clip.sourceIn - 1e-6 || w.end > clip.sourceOut + 1e-6) continue;
    out.push({ text: w.text, start: round3(clip.start + (w.start - clip.sourceIn) / clip.speed), end: round3(clip.start + (w.end - clip.sourceIn) / clip.speed) });
  }
  return out;
}
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** What the person sees before cutting: "3 filler words (um ×2, uh) · 0.9 s". */
export function describeFillers(fillers: readonly Word[]): string {
  if (!fillers.length) return "No filler words found.";
  const counts = new Map<string, number>();
  for (const f of fillers) counts.set(norm(f.text), (counts.get(norm(f.text)) ?? 0) + 1);
  const list = [...counts].map(([w, n]) => (n > 1 ? `${w} ×${n}` : w)).join(", ");
  const secs = fillers.reduce((n, f) => n + (f.end - f.start), 0);
  return `${fillers.length} filler word${fillers.length === 1 ? "" : "s"} (${list}), about ${secs.toFixed(1)} s.`;
}

/** Whisper-style models mark non-speech as [MUSIC] or (laughs); these are not captions. */
export const isNonSpeech = (t: string) => /^[[(*♪].*[\])*♪]$/.test(t.trim()) || /^[♪\s]*$/.test(t);

/**
 * Whisper often leaves hesitation sounds out of its transcript. They still leave a trace: a stretch of speech-level
 * sound in a gap between written words. This finds those stretches. It is a guess, so callers show it separately.
 * Gaps are trimmed 0.1 s each side first because the model's word times are loose; a gap that is quiet, or whose sound
 * is much quieter than the speech, is ignored. Music or noise under the speech at speech level will look like a hesitation.
 */
export function voicedGaps(words: readonly Word[], samples: Float32Array, rate: number, options: { minSeconds?: number; maxSeconds?: number; slack?: number } = {}): Word[] {
  const minSeconds = options.minSeconds ?? 0.2, maxSeconds = options.maxSeconds ?? 1.5, slack = options.slack ?? 0.1;
  const ws = cleanWords(words);
  if (ws.length === 0) return [];
  const frame = Math.max(1, Math.round(rate * 0.02)), frames = Math.floor(samples.length / frame);
  const rms = new Float32Array(frames);
  for (let f = 0; f < frames; f++) { let e = 0; for (let i = f * frame; i < (f + 1) * frame; i++) e += samples[i] * samples[i]; rms[f] = Math.sqrt(e / frame); }
  const inWords: number[] = [];
  for (const w of ws) for (let f = Math.floor(w.start / 0.02); f <= Math.min(frames - 1, Math.floor(w.end / 0.02)); f++) inWords.push(rms[f]);
  if (inWords.length === 0) return [];
  inWords.sort((a, b) => a - b);
  const threshold = Math.max(inWords[Math.floor(inWords.length / 2)] * 0.35, 0.004);
  const out: Word[] = [];
  const gaps: Array<[number, number]> = [[0, ws[0].start]];
  for (let i = 0; i + 1 < ws.length; i++) gaps.push([ws[i].end, ws[i + 1].start]);
  for (const [g0, g1] of gaps) {
    const a = Math.floor((g0 + slack) / 0.02), b = Math.min(frames, Math.floor((g1 - slack) / 0.02));
    let runStart = -1, best: [number, number] | null = null;
    for (let f = a; f <= b; f++) {
      const loud = f < b && rms[f] >= threshold;
      if (loud && runStart < 0) runStart = f;
      if (!loud && runStart >= 0) { if (!best || f - runStart > best[1] - best[0]) best = [runStart, f]; runStart = -1; }
    }
    if (!best) continue;
    const len = (best[1] - best[0]) * 0.02;
    if (len >= minSeconds && len <= maxSeconds) out.push({ text: "(hesitation)", start: round3(best[0] * 0.02), end: round3(best[1] * 0.02) });
  }
  return out;
}
