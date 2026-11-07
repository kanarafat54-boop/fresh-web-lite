import assert from "node:assert/strict";
import fs from "node:fs";
import { buildHistory, dayLabel, progressLabel } from "../src/features/fresh-flow/core/shortsHistory.ts";

const row = (media_id, event_type, created_at) => ({ media_id, event_type, created_at });

// Only real watching makes history: skips, likes and comment opens do not.
assert.deepEqual(buildHistory([row("a", "skip", "2026-11-01T10:00:00Z"), row("b", "like", "2026-11-01T10:00:00Z"), row("c", "comment_open", "2026-11-01T10:00:00Z")]), []);

// One entry per Short, furthest milestone kept, newest first.
const h = buildHistory([
  row("a", "play_25", "2026-11-01T10:00:00Z"),
  row("a", "complete", "2026-11-01T10:01:00Z"),
  row("b", "play_25", "2026-11-02T09:00:00Z"),
  row("b", "play_50", "2026-11-02T09:00:10Z"),
]);
assert.deepEqual(h.map((e) => e.mediaId), ["b", "a"]);
assert.equal(h[1].furthest, "complete");
assert.equal(h[0].furthest, "play_50");
assert.equal(h[1].lastWatchedAt, "2026-11-01T10:01:00Z");

// Watching the same Short twice counts two viewings; a lone later milestone still counts as one.
const twice = buildHistory([row("a", "play_25", "2026-11-01T10:00:00Z"), row("a", "play_25", "2026-11-03T10:00:00Z")]);
assert.equal(twice[0].sessions, 2);
assert.equal(buildHistory([row("a", "complete", "2026-11-01T10:00:00Z")])[0].sessions, 1);

// Bad rows are ignored instead of breaking the screen.
assert.deepEqual(buildHistory([row("a", "play_25", "not a date"), null, { event_type: "play_25" }, row(5, "play_25", "2026-11-01T10:00:00Z")]), []);

assert.equal(progressLabel("complete"), "Watched to the end");
assert.equal(progressLabel("play_25"), "Watched a part");

// Day labels use the viewer's local calendar day.
const now = new Date(2026, 10, 7, 12, 0, 0);
assert.equal(dayLabel(new Date(2026, 10, 7, 1, 0, 0).toISOString(), now), "Today");
assert.equal(dayLabel(new Date(2026, 10, 6, 23, 0, 0).toISOString(), now), "Yesterday");
assert.equal(dayLabel("nope", now), "Earlier");

// The service only touches the viewer's own Shorts events and never claims success on error.
const svc = fs.readFileSync(new URL("../src/features/fresh-flow/core/shortsHistoryService.ts", import.meta.url), "utf8");
assert.ok((svc.match(/\.eq\("actor_id", userId\)/g) ?? []).length >= 3, "every query is scoped to the viewer");
assert.ok(!/\.delete\(\)(?![^;]*actor_id)/.test(svc), "no unscoped delete");
assert.ok(svc.includes("return !error"), "failures are reported, not hidden");
console.log("fresh-shorts-history: ok");
