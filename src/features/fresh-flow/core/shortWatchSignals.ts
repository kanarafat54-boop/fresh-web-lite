/**
 * Watch-behavior signals for Fresh Shorts.
 *
 * Pure and framework-free so it can be tested without a browser. The Shorts
 * stream feeds it playback ticks for the ACTIVE video; it reports quartile
 * milestones, loop completions and whether the viewer skipped the item.
 * These become `fresh_flow_events` rows that ranking can learn from. Nothing
 * here stores content or identity beyond the media id the caller already has.
 */

export type WatchMilestone = "play_25" | "play_50" | "play_75" | "complete";

export type WatchLeaveVerdict = "skip" | "view";

/** A tick this far apart (in ms of media time) is treated as a seek, not watching. */
const MAX_CONTINUOUS_STEP_MS = 1500;
/** Leaving before this much real watching counts as a skip. */
const SKIP_ABSOLUTE_MS = 3000;
const SKIP_FRACTION = 0.2;
/** Reaching this fraction counts as having finished the video once. */
const COMPLETE_FRACTION = 0.92;

export type WatchTick = { milestones: WatchMilestone[]; completedLoop: boolean };

export class WatchTracker {
  private lastPositionMs: number | null = null;
  private watchedMs = 0;
  private emitted = new Set<WatchMilestone>();
  private armedForLoop = false;
  private loops = 0;

  /** Feed the latest playback position. Returns events newly earned by this tick. */
  update(positionMs: number, durationMs: number): WatchTick {
    const result: WatchTick = { milestones: [], completedLoop: false };
    if (!Number.isFinite(positionMs) || !Number.isFinite(durationMs) || durationMs <= 0 || positionMs < 0) return result;

    if (this.lastPositionMs !== null) {
      const delta = positionMs - this.lastPositionMs;
      if (delta > 0 && delta <= MAX_CONTINUOUS_STEP_MS) this.watchedMs += delta;
      // Wrapping back to the start after most of the clip = one more full watch (the video loops).
      if (delta < 0 && this.armedForLoop && positionMs < durationMs * 0.2) {
        this.loops += 1;
        this.armedForLoop = false;
        result.completedLoop = true;
      }
    }
    this.lastPositionMs = positionMs;

    const fraction = Math.min(1, this.watchedMs / durationMs);
    const crossed: Array<[WatchMilestone, number]> = [["play_25", 0.25], ["play_50", 0.5], ["play_75", 0.75], ["complete", COMPLETE_FRACTION]];
    for (const [name, threshold] of crossed) {
      if (fraction >= threshold && !this.emitted.has(name)) {
        this.emitted.add(name);
        result.milestones.push(name);
        if (name === "complete") this.armedForLoop = true;
      }
    }
    if (positionMs >= durationMs * COMPLETE_FRACTION && this.emitted.has("complete")) this.armedForLoop = true;
    return result;
  }

  /** Real (continuous) watch time so far, ignoring seeks. */
  get watchedMilliseconds(): number { return Math.round(this.watchedMs); }

  /** Number of times the clip played through again after the first completion. */
  get replays(): number { return this.loops; }

  /** Verdict when the viewer scrolls away. */
  leave(durationMs: number): WatchLeaveVerdict {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return this.watchedMs < SKIP_ABSOLUTE_MS ? "skip" : "view";
    const threshold = Math.min(SKIP_ABSOLUTE_MS, durationMs * SKIP_FRACTION);
    return this.watchedMs < threshold ? "skip" : "view";
  }
}
