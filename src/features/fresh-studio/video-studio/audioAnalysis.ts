/**
 * On-device silence detection from decoded audio samples (spec §11, §23.3: no server cost).
 * Pure: the browser decodes audio with Web Audio and passes samples in; tests pass synthetic signals.
 */
import { DEFAULT_SILENCE, type Range } from "./analysis.ts";
import { round3 } from "./timeline.ts";

export const ANALYSIS_SAMPLE_RATE = 8000;
export const MAX_ANALYSIS_SECONDS = 30 * 60;

/** Averages channels into one. */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0].length);
  for (const ch of channels) for (let i = 0; i < out.length; i += 1) out[i] += ch[i] / channels.length;
  return out;
}

/**
 * Finds stretches whose loudness stays under `noiseDb` for at least `minSilence` seconds.
 * Loudness is measured as RMS over short windows, so a single click does not break a silence.
 */
export function detectSilenceFromSamples(samples: Float32Array, sampleRate: number, options: { noiseDb?: number; minSilence?: number; windowSeconds?: number } = {}): Range[] {
  const noiseDb = options.noiseDb ?? DEFAULT_SILENCE.noiseDb;
  const minSilence = options.minSilence ?? DEFAULT_SILENCE.minSilence;
  const windowSeconds = options.windowSeconds ?? 0.02;
  if (!(sampleRate > 0) || samples.length === 0) return [];
  const threshold = 10 ** (noiseDb / 20);
  const win = Math.max(1, Math.round(sampleRate * windowSeconds));
  const total = samples.length / sampleRate;

  const out: Range[] = [];
  let runStart: number | null = null;
  const close = (end: number) => {
    if (runStart !== null && end - runStart >= minSilence) out.push({ start: round3(runStart), end: round3(Math.min(end, total)) });
    runStart = null;
  };
  for (let at = 0; at < samples.length; at += win) {
    const stop = Math.min(at + win, samples.length);
    let sum = 0;
    for (let i = at; i < stop; i += 1) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / (stop - at));
    const t = at / sampleRate;
    if (rms < threshold) { if (runStart === null) runStart = t; } else close(t);
  }
  close(total);
  return out;
}
