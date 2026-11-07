/** Thumbnails and waveform peaks for the timeline. Browser-only except `computePeaks`, which is pure. */
export const PEAKS_PER_SECOND = 20;

/** Loudest absolute sample per bucket, scaled 0–1. Cheap enough to draw thousands of bars. */
export function computePeaks(samples: Float32Array, sampleRate: number, perSecond = PEAKS_PER_SECOND): Float32Array {
  if (!(sampleRate > 0) || samples.length === 0) return new Float32Array(0);
  const size = Math.max(1, Math.floor(sampleRate / perSecond));
  const out = new Float32Array(Math.ceil(samples.length / size));
  for (let b = 0; b < out.length; b += 1) {
    let max = 0;
    const end = Math.min(samples.length, (b + 1) * size);
    for (let i = b * size; i < end; i += 1) { const v = Math.abs(samples[i]); if (v > max) max = v; }
    out[b] = Math.min(1, max);
  }
  return out;
}

export type Filmstrip = { urls: string[]; aspect: number };

const seekTo = (video: HTMLVideoElement, t: number) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new Error("seek timeout")), 4000);
  video.onseeked = () => { window.clearTimeout(timer); resolve(); };
  video.onerror = () => { window.clearTimeout(timer); reject(new Error("decode error")); };
  video.currentTime = t;
});

/** Evenly spaced frames across the whole file. Returns null if the browser cannot decode it. */
export async function extractFilmstrip(url: string, duration: number, count: number, height = 72): Promise<Filmstrip | null> {
  const video = document.createElement("video");
  video.muted = true; video.preload = "auto"; video.playsInline = true; video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("load timeout")), 15000);
      video.onloadeddata = () => { window.clearTimeout(timer); resolve(); };
      video.onerror = () => { window.clearTimeout(timer); reject(new Error("load error")); };
    });
    const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
    const canvas = document.createElement("canvas");
    canvas.height = height; canvas.width = Math.max(1, Math.round(height * aspect));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const urls: string[] = [];
    for (let i = 0; i < count; i += 1) {
      await seekTo(video, Math.min(duration - 0.05, ((i + 0.5) / count) * duration));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      urls.push(canvas.toDataURL("image/jpeg", 0.6));
    }
    return { urls, aspect };
  } catch {
    return null;
  } finally {
    video.removeAttribute("src"); video.load();
  }
}

export const filmstripCount = (duration: number) => Math.max(4, Math.min(16, Math.ceil(duration / 2)));
