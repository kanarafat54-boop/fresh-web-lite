import assert from "node:assert/strict";
import fs from "node:fs";
import { EMPTY_STATE, MAX_READ_IDS, applyState, categoryOf, clearAll, isMissingTableError, markAllRead, markRead, normalizeState, setCategoryEnabled, unreadCount } from "../src/features/fresh-flow/core/notificationState.ts";

const item = (id, kind, at, extra = {}) => ({ id, kind, at, actorId: null, actorName: "x", text: id, unread: false, ...extra });
const items = [
  item("l1", "like", "2026-11-05T10:00:00Z"),
  item("c1", "comment", "2026-11-04T10:00:00Z"),
  item("m1", "mention", "2026-11-03T10:00:00Z"),
  item("s1", "system", "2026-11-02T10:00:00Z", { unread: true }),
  item("s2", "system", "2026-11-01T10:00:00Z", { unread: false }),
];

// Categories: every kind maps to exactly one preference category.
assert.equal(categoryOf("like"), "reactions");
assert.equal(categoryOf("reaction"), "reactions");
assert.equal(categoryOf("moderation"), "comments");
assert.equal(categoryOf("reply"), "replies");
assert.equal(categoryOf("follow"), "followers");
for (const k of ["creator-update", "repost", "remix", "gift", "system"]) assert.equal(categoryOf(k), "creator", k);

// Fresh state: everything is unread except account notices the database already marked read.
let shown = applyState(items, EMPTY_STATE);
assert.deepEqual(shown.map((i) => [i.id, i.unread]), [["l1", true], ["c1", true], ["m1", true], ["s1", true], ["s2", false]]);
assert.equal(unreadCount(shown), 4);

// Opening one item marks only it read; repeating is a no-op.
let st = markRead(EMPTY_STATE, "c1");
assert.equal(markRead(st, "c1"), st);
shown = applyState(items, st);
assert.equal(shown.find((i) => i.id === "c1").unread, false);
assert.equal(unreadCount(shown), 3);

// Mark all read: older and equal items read, newer activity unread again.
st = markAllRead(st, new Date("2026-11-05T10:00:00Z"));
assert.equal(unreadCount(applyState(items, st)), 0);
const withNew = [item("l2", "like", "2026-11-06T00:00:00Z"), ...items];
assert.deepEqual(applyState(withNew, st).filter((i) => i.unread).map((i) => i.id), ["l2"]);
assert.deepEqual(st.readIds, [], "individual reads are folded into the time");

// An account notice already read in the database stays read.
assert.equal(applyState([item("s9", "system", "2026-11-09T00:00:00Z", { unread: false })], EMPTY_STATE)[0].unread, false);

// Clear hides everything up to the time; newer activity still appears.
st = clearAll(EMPTY_STATE, new Date("2026-11-04T12:00:00Z"));
assert.deepEqual(applyState(withNew, st).map((i) => i.id), ["l2", "l1"]);
assert.equal(unreadCount(applyState(items, st)), 1, "newer unseen item remains unread");

// Preferences hide a category; turning it back on restores it.
st = setCategoryEnabled(EMPTY_STATE, "mentions", false);
assert.ok(!applyState(items, st).some((i) => i.kind === "mention"));
assert.ok(!applyState(items, st).some((i) => i.id === "m1") && applyState(items, st).length === 4);
st = setCategoryEnabled(st, "mentions", true);
assert.equal(applyState(items, st).length, 5);
assert.deepEqual(setCategoryEnabled(setCategoryEnabled(EMPTY_STATE, "replies", false), "replies", false).disabledCategories, ["replies"], "no duplicates");

// Hidden categories do not count as unread.
assert.equal(unreadCount(applyState(items, setCategoryEnabled(EMPTY_STATE, "reactions", false))), 3);

// Read ids are capped.
let many = EMPTY_STATE;
for (let i = 0; i < MAX_READ_IDS + 50; i++) many = markRead(many, `id${i}`);
assert.equal(many.readIds.length, MAX_READ_IDS);
assert.equal(many.readIds.at(-1), `id${MAX_READ_IDS + 49}`);

// Garbage in, safe state out.
for (const bad of [null, undefined, 5, "x", [], { lastReadAt: "nope", readIds: [1, null, "a", "a"], disabledCategories: ["bogus", "mentions", "mentions"], clearedBefore: 7 }]) {
  const n = normalizeState(bad);
  assert.equal(n.lastReadAt, null); assert.equal(n.clearedBefore, null);
  assert.ok(n.readIds.every((x) => typeof x === "string"));
}
assert.deepEqual(normalizeState({ readIds: [1, null, "a", "a"], disabledCategories: ["bogus", "mentions", "mentions"] }), { lastReadAt: null, clearedBefore: null, readIds: ["a"], disabledCategories: ["mentions"] });

// Missing-table detection (migration not applied yet).
assert.equal(isMissingTableError({ code: "42P01" }), true);
assert.equal(isMissingTableError({ code: "PGRST205", message: "Could not find the table 'public.short_notification_state' in the schema cache" }), true);
assert.equal(isMissingTableError({ code: "42501", message: "permission denied" }), false);
assert.equal(isMissingTableError(null), false);

// Migration is additive, owner-only, and matches the app's categories and cap.
const sql = fs.readFileSync(new URL("../supabase/migrations/20261108100000_fresh_shorts_notification_state.sql", import.meta.url), "utf8");
assert.ok(/create table if not exists public\.short_notification_state/.test(sql) && /enable row level security/.test(sql));
assert.ok(!/\bdrop\s+(table|column)\b|\bdelete\s+from\b|\btruncate\b/i.test(sql.replace(/--.*$/gm, "")), "migration only adds");
assert.equal((sql.match(/auth\.uid\(\)\) = user_id/g) ?? []).length >= 4, true, "every policy is owner-only");
for (const c of ["reactions", "comments", "replies", "mentions", "followers", "creator"]) assert.ok(sql.includes(`'${c}'`), c);
assert.ok(sql.includes("<= 300") && !/to anon/i.test(sql.replace(/revoke[^;]*;/i, "")), "cap matches and anon gets nothing");

// The store never loses a change: it falls back to the device and says so.
const store = fs.readFileSync(new URL("../src/features/fresh-flow/core/notificationStateStore.ts", import.meta.url), "utf8");
assert.ok(store.includes('"device"') && store.includes("writeLocal") && store.includes("isMissingTableError"));
const ui = fs.readFileSync(new URL("../src/features/fresh-flow/components/ShortsNotifications.tsx", import.meta.url), "utf8");
assert.ok(ui.includes("Mark all read") && ui.includes("Clear") && ui.includes("Preferences") && ui.includes("Saved on this device only"), "screen exposes the controls and states where they are saved");
console.log("fresh-shorts-notification-state: ok");
