import assert from "node:assert/strict";
import { parseLens } from "../src/features/fresh-flow/core/audienceLensLogic.ts";
assert.deepEqual(parseLens(null), { enough: false, viewers: 0, minViewers: 5 });
assert.deepEqual(parseLens({ enough: false, viewers: 2, minViewers: 5 }), { enough: false, viewers: 2, minViewers: 5 });
const l = parseLens({ enough: true, viewers: 20, start: 20, q25: 16, q50: 8, q75: 6, complete: 5 });
assert.equal(l.enough, true);
assert.deepEqual(l.steps.map((s) => s.pct), [100, 80, 40, 30, 25]);
assert.deepEqual(l.biggestDrop, { from: "25%", to: "50%", lost: 8 });
// Uneven counts never produce an increasing funnel or >100%.
const u = parseLens({ enough: true, viewers: 10, start: 6, q25: 9, q50: 12, q75: 3, complete: 4 });
assert.ok(u.steps.every((s, i, a) => i === 0 || s.viewers <= a[i - 1].viewers));
assert.ok(u.steps.every((s) => s.pct <= 100));
assert.equal(parseLens({ enough: true, viewers: 9, start: 0 }).biggestDrop, null);
assert.equal(parseLens({ enough: true, viewers: -3, start: "x" }).enough, true);
console.log("fresh-audience-lens: ok");
