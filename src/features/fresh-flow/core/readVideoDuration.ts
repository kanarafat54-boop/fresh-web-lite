import { normalizeDuration } from "./shortsDuration";

/**
 * Reads a video's length in seconds from its URL or file using only the browser. Returns null when the
 * browser cannot tell (blocked, unsupported, or too slow), so publishing never fails because of it.
 */
export function readVideoDuration(source: string | Blob, timeoutMs = 6000): Promise<number | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = typeof source === "string" ? null : URL.createObjectURL(source);
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(normalizeDuration(value));
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    video.preload = "metadata";
    video.muted = true;
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) { finish(video.duration); return; }
      // Recordings made in the browser often report Infinity until the end is reached once.
      video.onseeked = null;
      video.ontimeupdate = () => { if (Number.isFinite(video.duration)) finish(video.duration); };
      video.currentTime = 1e101;
    };
    video.src = objectUrl ?? (source as string);
  });
}
