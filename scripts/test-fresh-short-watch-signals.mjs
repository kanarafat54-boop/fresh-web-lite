import assert from "node:assert/strict";
import { WatchTracker } from "../src/features/fresh-flow/core/shortWatchSignals.ts";

// Simulate playback ticks every 250 ms of media time.
function play(tracker, fromMs, toMs, durationMs, step = 250) {
  const events = [];
  for (let t = fromMs; t <= toMs; t += step) events.push(...tracker.update(t, durationMs).milestones);
  return events;
}

// Normal watch to the end emits each milestone exactly once, in order.
{
  const tracker = new WatchTracker();
  const events = play(tracker, 0, 20000, 20000);
  assert.deepEqual(events, ["play_25", "play_50", "play_75", "complete"]);
  assert.equal(tracker.leave(20000), "view");
  assert.equal(play(tracker, 20000, 20250, 20000).length, 0, "milestones are not re-emitted");
}

// Leaving after ~1s is a skip; a 15s clip left after 4s is a view.
{
  const quick = new WatchTracker();
  play(quick, 0, 1000, 15000);
  assert.equal(quick.leave(15000), "skip");
  const some = new WatchTracker();
  play(some, 0, 4000, 15000);
  assert.equal(some.leave(15000), "view");
}

// A very short clip (4s): leaving after 0.5s is a skip, after the 20% threshold (0.8s) is a view.
{
  const t = new WatchTracker();
  play(t, 0, 500, 4000);
  assert.equal(t.leave(4000), "skip");
  const t2 = new WatchTracker();
  play(t2, 0, 1000, 4000);
  assert.equal(t2.leave(4000), "view");
}

// Seeking forward does not count as watching (no fake completion by scrubbing).
{
  const t = new WatchTracker();
  t.update(0, 20000);
  const jumped = t.update(19000, 20000);
  assert.deepEqual(jumped.milestones, []);
  assert.ok(t.watchedMilliseconds < 1000);
  assert.equal(t.leave(20000), "skip");
}

// Looping: after completing, wrapping to the start counts as a replay exactly once per loop.
{
  const t = new WatchTracker();
  play(t, 0, 10000, 10000);
  const wrapped = t.update(100, 10000);
  assert.equal(wrapped.completedLoop, true);
  assert.equal(t.replays, 1);
  assert.equal(t.update(200, 10000).completedLoop, false);
  play(t, 300, 10000, 10000);
  assert.equal(t.update(50, 10000).completedLoop, true);
  assert.equal(t.replays, 2);
}

// Garbage inputs never throw or emit.
{
  const t = new WatchTracker();
  for (const [p, d] of [[NaN, 1000], [100, 0], [-5, 1000], [Infinity, 1000], [100, NaN]]) {
    assert.deepEqual(t.update(p, d), { milestones: [], completedLoop: false });
  }
}

console.log("Fresh Short watch-signal tests: PASS");
