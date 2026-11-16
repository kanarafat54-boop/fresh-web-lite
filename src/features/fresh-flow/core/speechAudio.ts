/** Audio preparation for on-device speech recognition: mono, 16 kHz, in pieces the model can take. */

export const SPEECH_SAMPLE_RATE = 16000;
export const MAX_SPEECH_SECONDS = 10 * 60;

export function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const length = Math.min(...channels.map((c) => c.length));
  const out = new Float32Array(length);
  for (const channel of channels) for (let i = 0; i < length; i += 1) out[i] += channel[i];
  for (let i = 0; i < length; i += 1) out[i] /= channels.length;
  return out;
}

/** Area-average resampling: each output sample is the mean of the input it covers, which also filters out frequencies the lower rate cannot hold. */
export function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (!(fromRate > 0) || !(toRate > 0)) throw new Error("Sample rates must be positive.");
  if (fromRate === toRate) return input;
  const outLength = Math.floor((input.length * toRate) / fromRate);
  const out = new Float32Array(outLength);
  const ratio = fromRate / toRate;
  for (let i = 0; i < outLength; i += 1) {
    const start = i * ratio;
    const end = Math.min(input.length, start + ratio);
    const first = Math.floor(start);
    let sum = 0;
    let weight = 0;
    for (let j = first; j < end; j += 1) {
      const w = Math.min(j + 1, end) - Math.max(j, start);
      if (w <= 0) continue;
      sum += input[j] * w;
      weight += w;
    }
    out[i] = weight > 0 ? sum / weight : 0;
  }
  return out;
}

/** Peak-normalises quiet recordings (never amplifies by more than 8x, so silence stays silence). */
export function normalizePeak(samples: Float32Array, target = 0.9, maxGain = 8): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) { const a = Math.abs(samples[i]); if (a > peak) peak = a; }
  if (peak === 0 || peak >= target) return samples;
  const gain = Math.min(maxGain, target / peak);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) out[i] = samples[i] * gain;
  return out;
}

/** True when the audio is effectively silent, so recognition is skipped instead of inventing words. */
export function isSilent(samples: Float32Array, threshold = 0.005): boolean {
  if (samples.length === 0) return true;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length) < threshold;
}

export type AudioDecode = { samples: Float32Array; seconds: number };

export function prepareForSpeech(channels: Float32Array[], sampleRate: number): AudioDecode {
  const mono = downmixToMono(channels);
  const resampled = resample(mono, sampleRate, SPEECH_SAMPLE_RATE);
  return { samples: normalizePeak(resampled), seconds: resampled.length / SPEECH_SAMPLE_RATE };
}

/** Fetches a media file and decodes its audio track. Throws a plain-language error. */
export async function decodeMediaAudio(url: string): Promise<AudioDecode> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Fresh could not read the video's audio.");
  const buffer = await response.arrayBuffer();
  const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctx) throw new Error("This browser cannot read audio for captions.");
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(buffer);
    if (decoded.duration > MAX_SPEECH_SECONDS) throw new Error("This video is too long for automatic captions on a device (limit 10 minutes).");
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
    return prepareForSpeech(channels, decoded.sampleRate);
  } catch (error) {
    if (error instanceof Error && /too long/.test(error.message)) throw error;
    throw new Error("Fresh could not decode this video's audio. It may have no sound track.");
  } finally {
    void ctx.close().catch(() => undefined);
  }
}
