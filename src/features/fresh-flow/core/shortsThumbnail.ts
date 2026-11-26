/** "0:47", "1:05", "12:30". Returns null for anything that is not a positive, finite number of seconds. */
export function formatShortDuration(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

/** A still at 0.1s shows the first real frame without waiting for playback; a hash already on the URL is replaced. */
export function firstFrameSrc(videoUrl: string): string {
  return `${videoUrl.split("#")[0]}#t=0.1`;
}
