import assert from "node:assert/strict";
import { getShortsResourcePolicy, getShortsResourceWindow } from "../src/features/fresh-flow/core/shortsPerformance.ts";

const active = getShortsResourcePolicy(5, 5, "4g");
assert.equal(active.priority, "active");
assert.equal(active.preload, "auto");
assert.equal(active.keepDecoded, true);

const slowNearby = getShortsResourcePolicy(6, 5, "2g");
assert.equal(slowNearby.priority, "nearby");
assert.equal(slowNearby.preload, "metadata");
assert.equal(slowNearby.keepDecoded, false);

const distant = getShortsResourcePolicy(9, 5, "4g");
assert.equal(distant.priority, "distant");
assert.equal(distant.preload, "none");
assert.equal(distant.keepDecoded, false);

assert.deepEqual(getShortsResourceWindow(10, 5, 2), [3, 4, 5, 6, 7]);
assert.deepEqual(getShortsResourceWindow(3, 0, 2), [0, 1, 2]);
assert.deepEqual(getShortsResourceWindow(0, 0, 2), []);

console.log("Fresh Flow performance contract: PASS");
