import assert from "node:assert/strict";
import fs from "node:fs";
import { summarizeSound, sortTopicShorts, creatorsLabel } from "../src/features/fresh-flow/core/shortsSound.ts";

const r = (id, author_id, created_at) => ({ id, author_id, created_at });

// Complete sample: exact creators and a real first use.
const full = summarizeSound([r("s2", "b", "2026-02-01T00:00:00Z"), r("s1", "a", "2026-01-01T00:00:00Z"), r("s3", "a", "2026-03-01T00:00:00Z")], 3);
assert.equal(full.total, 3);
assert.equal(full.creators, 2);
assert.equal(full.creatorsIsLowerBound, false);
assert.deepEqual(full.firstUse, { shortId: "s1", authorId: "a", at: "2026-01-01T00:00:00Z" });
assert.equal(creatorsLabel(full), "2");

// Partial sample: total stays exact, creators is a lower bound, and no first use is claimed.
const partial = summarizeSound([r("s1", "a", "2026-01-01T00:00:00Z"), r("s2", "b", "2026-02-01T00:00:00Z")], 5000);
assert.equal(partial.total, 5000);
assert.equal(partial.creatorsIsLowerBound, true);
assert.equal(partial.firstUse, null, "first use is not claimed from a partial sample");
assert.equal(creatorsLabel(partial), "2+");

// Nothing or bad data never invents numbers.
assert.deepEqual(summarizeSound([], 0), { total: 0, creators: 0, creatorsIsLowerBound: false, firstUse: null });
assert.equal(summarizeSound([r("x", "a", "bad date")], 1).creators, 0);
assert.equal(summarizeSound([], NaN).total, 0);
assert.equal(summarizeSound([r("s1", "a", "2026-01-01T00:00:00Z")], 0).total, 1, "total is never below what was seen");

// Sorting.
const items = [{ id: 1, viewCount: 5, createdAt: "2026-01-01T00:00:00Z" }, { id: 2, viewCount: 9, createdAt: "2026-01-02T00:00:00Z" }, { id: 3, viewCount: 9, createdAt: "2026-01-03T00:00:00Z" }];
assert.deepEqual(sortTopicShorts(items, "popular").map((i) => i.id), [3, 2, 1]);
assert.deepEqual(sortTopicShorts(items, "recent").map((i) => i.id), [3, 2, 1]);
assert.deepEqual(items.map((i) => i.id), [1, 2, 3], "input is not mutated");

// The disabled "Use this sound" button must not claim a false reason.
const page = fs.readFileSync(new URL("../src/features/fresh-flow/components/ShortsTopicPage.tsx", import.meta.url), "utf8");
assert.ok(!/video worker/i.test(page), "no false 'video worker' explanation");
assert.ok(/count:\s*"exact"/.test(fs.readFileSync(new URL("../src/features/fresh-flow/core/shortsTopics.ts", import.meta.url), "utf8")), "usage count is an exact database count");
console.log("fresh-shorts-sound: ok");
