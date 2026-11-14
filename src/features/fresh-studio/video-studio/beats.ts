/**
 * On-device beat detection (no server, no AI service). Pure: decoded mono samples in, beat times out.
 * Method: loudness-rise envelope, tempo from its autocorrelation, then the grid phase that lines up with the hits.
 * It is built for music with a steady pulse. When no clear pulse is found it says so instead of guessing.
 */
import { clipEnd, round3, splitClip, trackClips, MIN_CLIP_SECONDS, type TimelineClip, type TimelineDoc } from "./timeline.ts";

export type BeatResult = { bpm: number; beats: number[]; confidence: number };

export const MIN_BPM = 60;
export const MAX_BPM = 180;
/** Below this the pulse is too weak to trust (0 to 1). */
export const MIN_CONFIDENCE = 0.25;

const HOP_SECONDS = 0.016;
const WINDOW_SECONDS = 0.032;

function onsetEnvelope(samples: Float32Array, sampleRate: number): Float32Array {
  const hop = Math.max(1, Math.round(sampleRate * HOP_SECONDS));
  const win = Math.max(hop, Math.round(sampleRate * WINDOW_SECONDS));
  const frames = Math.max(0, Math.floor((samples.length - win) / hop) + 1);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    const at = f * hop;
    for (let i = at; i < at + win; i += 1) sum += samples[i] * samples[i];
    energy[f] = Math.log1p(1000 * Math.sqrt(sum / win));
  }
  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f += 1) flux[f] = Math.max(0, energy[f] - energy[f - 1]);
  return flux;
}

export function detectBeats(samples: Float32Array, sampleRate: number): BeatResult | null {
  if (!(sampleRate > 0) || samples.length < sampleRate * 4) return null;
  const flux = onsetEnvelope(samples, sampleRate);
  const n = flux.length;
  const minLag = Math.round(60 / MAX_BPM / HOP_SECONDS);
  const maxLag = Math.round(60 / MIN_BPM / HOP_SECONDS);
  if (n < maxLag * 3) return null;

  let mean = 0;
  for (const v of flux) mean += v;
  mean /= n;
  const centred = flux.map((v) => v - mean);

  const ac = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag += 1) {
    let sum = 0;
    for (let i = lag; i < n; i += 1) sum += centred[i] * centred[i - lag];
    ac[lag] = sum / (n - lag);
  }
  let best = minLag, bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    // A light preference for common tempos stops a half or double reading from winning on noise.
    const bpm = 60 / (lag * HOP_SECONDS);
    const prior = 1 - 0.15 * Math.abs(Math.log2(bpm / 115));
    const score = ac[lag] * prior;
    if (score > bestScore) { bestScore = score; best = lag; }
  }
  let variance = 0;
  for (const v of centred) variance += v * v;
  variance /= n;
  // How much of the loudness-rise pattern repeats at this tempo: near 1 for a steady pulse, near 0 for noise.
  const confidence = variance > 0 ? ac[best] / variance : 0;
  if (!(ac[best] > 0) || confidence < MIN_CONFIDENCE) return null;

  // Refine the period with the neighbours (parabolic peak), then find the phase that catches the most hits.
  const a = ac[best - 1] ?? ac[best], b = ac[best], c = ac[best + 1] ?? ac[best];
  const denom = a - 2 * b + c;
  const period = best + (denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0);
  let phase = 0, phaseScore = -Infinity;
  for (let p = 0; p < Math.ceil(period); p += 1) {
    let sum = 0;
    for (let at = p; at < n; at += period) sum += flux[Math.round(at)] ?? 0;
    if (sum > phaseScore) { phaseScore = sum; phase = p; }
  }
  // Snap each grid point to the strongest hit near it, then fit a straight line through those hits so a small
  // tempo error does not drift over a long track.
  const reach = Math.max(1, Math.round(period * 0.2));
  const xs: number[] = [], ys: number[] = [];
  for (let k = 0; phase + k * period < n; k += 1) {
    const centre = Math.round(phase + k * period);
    let peak = centre, high = -1;
    for (let f = Math.max(0, centre - reach); f <= Math.min(n - 1, centre + reach); f += 1) if (flux[f] > high) { high = flux[f]; peak = f; }
    if (high > mean * 2) { xs.push(k); ys.push(peak); }
  }
  let origin = phase, step = period;
  if (xs.length >= 4) {
    const mx = xs.reduce((a, v) => a + v, 0) / xs.length, my = ys.reduce((a, v) => a + v, 0) / ys.length;
    let num = 0, den = 0;
    for (let i = 0; i < xs.length; i += 1) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    if (den > 0 && num / den > 0) { step = num / den; origin = my - step * mx; }
  }
  const seconds = samples.length / sampleRate;
  const beats: number[] = [];
  for (let k = 0; ; k += 1) {
    const t = (origin + k * step) * HOP_SECONDS + WINDOW_SECONDS / 2;
    if (t >= seconds) break;
    if (t >= 0) beats.push(round3(t));
  }
  return { bpm: Math.round((60 / (step * HOP_SECONDS)) * 10) / 10, beats, confidence: round3(confidence) };
}

/** Beat times of a clip's source, placed on the timeline (only the part the clip actually plays). */
export function beatsOnTimeline(clip: TimelineClip, sourceBeats: number[]): number[] {
  return sourceBeats
    .filter((b) => b > clip.sourceIn && b < clip.sourceOut)
    .map((b) => round3(clip.start + (b - clip.sourceIn) / clip.speed));
}

/** Every `every`-th beat, counting from the first. */
export function everyNth(times: number[], every: number): number[] {
  const step = Math.max(1, Math.floor(every));
  return times.filter((_, i) => i % step === 0);
}

export type BeatCutResult = { doc: TimelineDoc; splits: number };

/** Splits the clips of one track wherever a time falls inside them, skipping cuts that leave a sliver. */
export function splitTrackAt(doc: TimelineDoc, trackId: string, times: number[], minSegment = 0.4): BeatCutResult {
  let next = doc;
  let splits = 0;
  for (const t of [...times].sort((x, y) => x - y)) {
    const host = trackClips(next, trackId).find((c) => t - c.start >= Math.max(minSegment, MIN_CLIP_SECONDS) && clipEnd(c) - t >= Math.max(minSegment, MIN_CLIP_SECONDS));
    if (!host) continue;
    next = splitClip(next, host.id, t);
    splits += 1;
  }
  return { doc: next, splits };
}
