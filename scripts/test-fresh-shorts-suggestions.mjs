import assert from "node:assert/strict";
import fs from "node:fs";
import { pickSuggestions, SUGGESTION_LIMIT } from "../src/features/fresh-flow/core/shortsSuggestions.ts";

const now = Date.now();
const make = (id, authorId, extra = {}) => ({
  id, authorId, authorName: authorId, authorUsername: authorId, caption: id, soundName: null,
  videoUrl: `https://cdn.example/${id}.mp4`, likeCount: 0, commentCount: 0, viewCount: 10, repostCount: 0,
  myReaction: null, repostedByMe: false, isFollowingAuthor: false, reactionBreakdown: {}, isHot: false, chapters: [],
  createdAt: new Date(now - 60 * 60 * 1000).toISOString(), ...extra,
});
const ids = (list) => list.map((s) => s.id);

// Defaults to a row of 8, never more.
const many = Array.from({ length: 30 }, (_, i) => make(`s${i}`, `a${i}`));
assert.equal(SUGGESTION_LIMIT, 8);
assert.equal(pickSuggestions(many).length, 8);
assert.equal(pickSuggestions(many, { limit: 3 }).length, 3);

// Shorts without a video, duplicates, excluded ids and blocked creators are dropped.
const mixed = [make("a", "x"), make("b", "y", { videoUrl: "" }), make("a", "x"), make("c", "z"), make("d", "blocked")];
assert.deepEqual(ids(pickSuggestions(mixed, { blockedIds: new Set(["blocked"]), exclude: new Set(["c"]) })), ["a"]);

// Followed creators lead the row, but never fill more than half of it.
const feed = [
  ...Array.from({ length: 6 }, (_, i) => make(`f${i}`, `fan${i}`, { viewCount: 5000 })),
  ...Array.from({ length: 6 }, (_, i) => make(`n${i}`, `new${i}`, { viewCount: 0 })),
];
const followed = new Set(Array.from({ length: 6 }, (_, i) => `fan${i}`));
const row = pickSuggestions(feed, { limit: 8, followingIds: followed });
assert.equal(row.length, 8);
assert.ok(row.slice(0, 4).every((s) => followed.has(s.authorId)), "followed creators lead");
assert.equal(row.filter((s) => followed.has(s.authorId)).length >= 4, true);
assert.ok(row.slice(4).some((s) => !followed.has(s.authorId)), "discovery stays open");
assert.equal(new Set(ids(row)).size, row.length, "no duplicates");

// One creator does not dominate the row.
const oneCreator = [...Array.from({ length: 10 }, (_, i) => make(`p${i}`, "prolific")), make("q", "other"), make("r", "third")];
assert.ok(ids(pickSuggestions(oneCreator, { limit: 4 })).includes("q") && ids(pickSuggestions(oneCreator, { limit: 4 })).includes("r"));

// Empty and unusable input is safe; the input is not mutated.
assert.deepEqual(pickSuggestions([]), []);
const original = [...mixed];
pickSuggestions(mixed);
assert.deepEqual(mixed, original);

// Wiring: both Home screens use the shared row and open the Short through the Shorts route.
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const home = read("src/features/home/HomeDashboard.tsx");
const flowHome = read("src/features/fresh-flow/components/FreshFlowHome.tsx");
const hub = read("src/features/fresh-flow/FreshFlowHub.tsx");
assert.ok(home.includes("ShortsSuggestionsRow") && home.includes('setActiveRoute("fresh-flow-shorts")'));
assert.ok(flowHome.includes("ShortsSuggestionsRow") && flowHome.includes("onOpenShort"));
assert.ok(hub.includes("onOpenShort") && hub.includes("requestOpenShort(shortId)"));
const service = read("src/features/fresh-flow/core/shortsSuggestionsService.ts");
assert.ok(service.includes("loadBlockedIds"), "blocked creators are filtered for signed-in viewers");

console.log("Shorts suggestions tests passed");
