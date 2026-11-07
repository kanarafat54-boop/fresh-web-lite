import assert from "node:assert/strict";
import { applyShortFilters, normalizeShortFilters, activeFilterCount, DEFAULT_SHORT_FILTERS } from "../src/features/fresh-flow/core/shortsFilters.ts";

const now = Date.parse("2026-11-04T12:00:00Z");
const hours = (h) => new Date(now - h * 3600_000).toISOString();
const mk = (id, over = {}) => ({ id, authorUsername: "creator" + id, authorName: "Name " + id, createdAt: hours(1), viewCount: 10, remixOfShortId: null, duetOfShortId: null, ...over });
const set = [
  mk("a", { createdAt: hours(2), viewCount: 50 }),
  mk("b", { createdAt: hours(30), viewCount: 500, remixOfShortId: "x" }),
  mk("c", { createdAt: hours(24 * 10), viewCount: 5, duetOfShortId: "y" }),
  mk("d", { createdAt: hours(24 * 45), viewCount: 900, authorUsername: "QueenVibes" }),
  mk("e", { createdAt: "not-a-date" }),
];
const ids = (list) => list.map((s) => s.id).join("");

assert.equal(ids(applyShortFilters(set, DEFAULT_SHORT_FILTERS, now)), "abcde", "defaults change nothing");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, date: "day" }, now)), "a");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, date: "week" }, now)), "ab");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, date: "month" }, now)), "abc");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, origin: "remix" }, now)), "bc", "remixes and duets");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, origin: "original" }, now)), "ade");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, creator: "@queen" }, now)), "d", "creator match ignores @ and case");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, creator: "name b" }, now)), "b", "creator matches display name too");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, order: "views" }, now)), "dbaec", "most viewed first");
assert.equal(ids(applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, order: "newest" }, now)), "abcde", "newest first, invalid dates last");
const unchanged = ids(set);
applyShortFilters(set, { ...DEFAULT_SHORT_FILTERS, order: "views" }, now);
assert.equal(ids(set), unchanged, "input array is never mutated");

assert.deepEqual(normalizeShortFilters({ date: "bogus", origin: 7, order: null, creator: "  x  " }), { date: "any", origin: "all", order: "ranked", creator: "x", duration: "any", language: "" });
assert.deepEqual(normalizeShortFilters(null), DEFAULT_SHORT_FILTERS);
assert.equal(normalizeShortFilters({ creator: "y".repeat(100) }).creator.length, 40);
assert.equal(activeFilterCount(DEFAULT_SHORT_FILTERS), 0);
assert.equal(activeFilterCount({ date: "day", origin: "remix", order: "views", creator: "z", duration: "any", language: "" }), 4);
assert.equal(activeFilterCount({ ...DEFAULT_SHORT_FILTERS, duration: "under15", language: "sw" }), 2);

// duration and language: unknown values never match, known values do
const clips = [mk("a", { durationSeconds: 8, language: "en" }), mk("b", { durationSeconds: 20, language: "sw" }), mk("c", { durationSeconds: 45, language: "en-US" }), mk("d", { durationSeconds: 90 }), mk("e")];
assert.equal(ids(applyShortFilters(clips, { ...DEFAULT_SHORT_FILTERS, duration: "under15" }, now)), "a");
assert.equal(ids(applyShortFilters(clips, { ...DEFAULT_SHORT_FILTERS, duration: "15to30" }, now)), "b");
assert.equal(ids(applyShortFilters(clips, { ...DEFAULT_SHORT_FILTERS, duration: "30to60" }, now)), "c");
assert.equal(ids(applyShortFilters(clips, { ...DEFAULT_SHORT_FILTERS, duration: "over60" }, now)), "d");
assert.equal(ids(applyShortFilters(clips, { ...DEFAULT_SHORT_FILTERS, language: "en" }, now)), "ac", "en-US counts as en; unknown language never matches");
assert.equal(ids(applyShortFilters(clips, DEFAULT_SHORT_FILTERS, now)), "abcde", "no filter keeps Shorts with unknown values");
assert.equal(ids(applyShortFilters(clips, { ...DEFAULT_SHORT_FILTERS, duration: "30to60", language: "en" }, now)), "c", "filters combine");
console.log("fresh-shorts-filters: ok");
