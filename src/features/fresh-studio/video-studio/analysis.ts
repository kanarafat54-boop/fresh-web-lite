/**
 * Smart-edit analysis (spec §11). Uses real signal analysis from ffmpeg, not a guessed model:
 * silence detection and scene-change detection become concrete timeline edits.
 * Everything here is pure; the caller runs ffmpeg with the argument builders and feeds the output back in.
 */
import { MIN_CLIP_SECONDS, TimelineError, clipEnd, deleteClip, round3, splitClip, trackClips, type TimelineClip, type TimelineDoc } from "./timeline.ts";

export type Range = { start: number; end: number };

export const DEFAULT_SILENCE = { noiseDb: -35, minSilence: 0.4 } as const;
export const DEFAULT_SCENE_THRESHOLD = 0.3;

export function silenceDetectArgs(input: string, opts: { noiseDb?: number; minSilence?: number } = {}): string[] {
  const noise = opts.noiseDb ?? DEFAULT_SILENCE.noiseDb;
  const dur = opts.minSilence ?? DEFAULT_SILENCE.minSilence;
  return ["-hide_banner", "-nostats", "-i", input, "-vn", "-af", `silencedetect=noise=${noise}dB:d=${dur}`, "-f", "null", "-"];
}

export function sceneDetectArgs(input: string, threshold = DEFAULT_SCENE_THRESHOLD): string[] {
  return ["-hide_banner", "-nostats", "-i", input, "-an", "-vf", `select='gt(scene,${threshold})',showinfo`, "-f", "null", "-"];
}

/** Parses `silencedetect` stderr. A trailing silence with no end runs to `totalDuration`. */
export function parseSilence(stderr: string, totalDuration: number): Range[] {
  const out: Range[] = [];
  let open: number | null = null;
  for (const line of stderr.split(/\r?\n/)) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    const e = line.match(/silence_end:\s*(-?[\d.]+)/);
    if (s) open = Math.max(0, Number(s[1]));
    if (e && open !== null) { out.push({ start: round3(open), end: round3(Math.min(Number(e[1]), totalDuration)) }); open = null; }
  }
  if (open !== null && totalDuration > open) out.push({ start: round3(open), end: round3(totalDuration) });
  return out.filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start);
}

/** Parses scene-change times from `showinfo` stderr. */
export function parseSceneTimes(stderr: string): number[] {
  const times = [...stderr.matchAll(/pts_time:\s*([\d.]+)/g)].map((m) => round3(Number(m[1]))).filter(Number.isFinite);
  return [...new Set(times)].sort((a, b) => a - b);
}

export type SilenceRemovalOptions = {
  /** Silence shorter than this is kept (natural pauses). */
  minSilence?: number;
  /** Silence kept on each side of a cut so speech is not clipped. */
  padding?: number;
  /** Cuts shorter than this are not worth making. */
  minRemove?: number;
};

export type SilenceRemovalResult = { doc: TimelineDoc; removedSeconds: number; cuts: number };

const EPS = 0.011;

function clipWithSourceRange(doc: TimelineDoc, trackId: string, assetId: string, a: number, b: number): TimelineClip | null {
  return trackClips(doc, trackId).find((c) => c.assetId === assetId && c.sourceIn <= a + EPS && c.sourceOut >= b - EPS) ?? null;
}

/**
 * Removes the silent parts of one clip. Works from the end backwards so earlier timeline
 * positions stay valid. Later video clips ripple left; clips on other tracks (music) stay in place.
 */
export function removeSilences(doc: TimelineDoc, clipId: string, silences: Range[], options: SilenceRemovalOptions = {}): SilenceRemovalResult {
  const minSilence = options.minSilence ?? DEFAULT_SILENCE.minSilence;
  const padding = options.padding ?? 0.1;
  const minRemove = options.minRemove ?? 0.15;
  const original = doc.clips.find((c) => c.id === clipId);
  if (!original) throw new TimelineError("That clip no longer exists.");
  const { trackId, assetId, sourceIn, sourceOut } = original;

  const cuts = silences
    .filter((s) => s.end - s.start >= minSilence)
    .map((s) => ({ a: Math.max(s.start + padding, sourceIn), b: Math.min(s.end - padding, sourceOut) }))
    .filter((c) => c.b - c.a >= minRemove)
    .sort((x, y) => y.a - x.a);

  let next = doc;
  let removed = 0;
  let count = 0;
  for (const cut of cuts) {
    let { a, b } = cut;
    const host = clipWithSourceRange(next, trackId, assetId, a, b);
    if (!host) continue;
    // Pieces shorter than the minimum clip length cannot exist, so absorb them into the cut.
    if ((a - host.sourceIn) / host.speed < MIN_CLIP_SECONDS) a = host.sourceIn;
    if ((host.sourceOut - b) / host.speed < MIN_CLIP_SECONDS) b = host.sourceOut;
    const toTimeline = (src: number) => round3(host.start + (src - host.sourceIn) / host.speed);

    let working = next;
    if (b < host.sourceOut - EPS) working = splitClip(working, host.id, toTimeline(b));
    const left = clipWithSourceRange(working, trackId, assetId, a, Math.min(b, host.sourceOut));
    if (!left) continue;
    if (a > left.sourceIn + EPS) working = splitClip(working, left.id, toTimeline(a));
    const middle = clipWithSourceRange(working, trackId, assetId, a, b);
    if (!middle || Math.abs(middle.sourceIn - a) > EPS) continue;
    const length = round3((middle.sourceOut - middle.sourceIn) / middle.speed);
    next = deleteClip(working, middle.id, true);
    removed += length;
    count += 1;
  }
  return { doc: next, removedSeconds: round3(removed), cuts: count };
}

export type SceneSplitResult = { doc: TimelineDoc; splits: number };

/** Splits one clip at detected scene changes, skipping splits that would leave very short pieces. */
export function splitAtScenes(doc: TimelineDoc, clipId: string, sceneTimes: number[], minSegment = 1): SceneSplitResult {
  const original = doc.clips.find((c) => c.id === clipId);
  if (!original) throw new TimelineError("That clip no longer exists.");
  let next = doc;
  let splits = 0;
  const points = sceneTimes
    .filter((t) => t > original.sourceIn && t < original.sourceOut)
    .map((t) => round3(original.start + (t - original.sourceIn) / original.speed))
    .sort((a, b) => a - b);
  let last = original.start;
  for (const t of points) {
    if (t - last < minSegment || clipEnd(original) - t < minSegment) continue;
    const host = trackClips(next, original.trackId).find((c) => c.assetId === original.assetId && t > c.start + MIN_CLIP_SECONDS && t < clipEnd(c) - MIN_CLIP_SECONDS);
    if (!host) continue;
    next = splitClip(next, host.id, t);
    splits += 1;
    last = t;
  }
  return { doc: next, splits };
}
