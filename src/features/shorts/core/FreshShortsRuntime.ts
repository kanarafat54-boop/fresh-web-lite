/**
 * Fresh Shorts Runtime
 *
 * Feed/player orchestration primitives for the Fresh Flow Shorts surface.
 * The component remains responsible for rendering; this layer owns the
 * rules for batching, active-item selection and media preloading.
 */

export const FRESH_SHORTS_PAGE_SIZE = 12;
export const FRESH_SHORTS_PREFETCH_RADIUS = 2;
export const FRESH_SHORTS_FETCH_AHEAD = 4;

export type ShortsRuntimeState = {
  activeIndex: number;
  loadedIndexes: Set<number>;
};

/** Return the indexes that should have media attached to their video element. */
export function getMediaWindow(activeIndex: number, itemCount: number): Set<number> {
  const result = new Set<number>();
  if (itemCount <= 0 || activeIndex < 0) return result;

  const start = Math.max(0, activeIndex - FRESH_SHORTS_PREFETCH_RADIUS);
  const end = Math.min(itemCount - 1, activeIndex + FRESH_SHORTS_PREFETCH_RADIUS);
  for (let index = start; index <= end; index += 1) result.add(index);
  return result;
}

/** Fetch the next page before the viewer reaches the end of the current batch. */
export function shouldFetchNextPage(activeIndex: number, itemCount: number, hasMore: boolean): boolean {
  if (!hasMore || itemCount <= 0 || activeIndex < 0) return false;
  return activeIndex >= Math.max(0, itemCount - FRESH_SHORTS_FETCH_AHEAD);
}

/**
 * Pick the most visible item.
 *
 * A sentinel of -1 is used instead of null so consumers can keep a numeric
 * active index without risking an accidental null state during scroll events.
 */
export function getActiveIndex(entries: Array<{ index: number; ratio: number }>): number {
  let best: { index: number; ratio: number } | null = null;
  for (const entry of entries) {
    if (!Number.isFinite(entry.index) || entry.index < 0) continue;
    if (!best || entry.ratio > best.ratio) best = entry;
  }
  return best?.index ?? -1;
}

/**
 * Keep exactly one video playing. Nearby videos may buffer, but never play.
 */
export function syncVideoPlayback(
  videos: Map<number, HTMLVideoElement>,
  activeIndex: number,
): void {
  videos.forEach((video, index) => {
    if (index === activeIndex) {
      video.muted = true;
      void video.play().catch(() => undefined);
    } else if (!video.paused) {
      video.pause();
    }
  });
}

/**
 * Release media outside the small active/preload window.
 *
 * Avoid calling load() when the element has no source: on large feeds this
 * prevents unnecessary media-pipeline churn while the user is swiping.
 */
export function releaseDistantMedia(
  videos: Map<number, HTMLVideoElement>,
  activeIndex: number,
  radius = FRESH_SHORTS_PREFETCH_RADIUS,
): void {
  videos.forEach((video, index) => {
    if (Math.abs(index - activeIndex) <= radius) return;
    video.pause();
    if (video.getAttribute("src") !== null) {
      video.removeAttribute("src");
      video.load();
    }
  });
}
