import assert from "node:assert/strict";
import { normalizeDataSaverMode, nextDataSaverMode, isDataSaverActive, prefetchRadiusFor, preloadFor, dataSaverLabel } from "../src/features/fresh-flow/core/shortsDataSaver.ts";

assert.equal(normalizeDataSaverMode("on"), "on");
assert.equal(normalizeDataSaverMode("garbage"), "auto");
assert.equal(normalizeDataSaverMode(null), "auto");
assert.deepEqual(["auto", "on", "off"].map(nextDataSaverMode), ["on", "off", "auto"]);

// explicit choices always win over the device signal
assert.equal(isDataSaverActive("on", { saveData: false, effectiveType: "4g" }), true);
assert.equal(isDataSaverActive("off", { saveData: true, effectiveType: "2g" }), false);
// auto follows Save-Data and slow connections, and stays off when the browser says nothing
assert.equal(isDataSaverActive("auto", { saveData: true }), true);
assert.equal(isDataSaverActive("auto", { effectiveType: "slow-2g" }), true);
assert.equal(isDataSaverActive("auto", { effectiveType: "2g" }), true);
assert.equal(isDataSaverActive("auto", { effectiveType: "4g" }), false);
assert.equal(isDataSaverActive("auto", null), false);
assert.equal(isDataSaverActive("auto", undefined), false);

// prefetching: normal keeps the radius, saver downloads only the current Short
assert.equal(prefetchRadiusFor(false, 2), 2);
assert.equal(prefetchRadiusFor(true, 2), 0);
assert.equal(preloadFor(5, 5, 0), "auto", "current Short always loads");
assert.equal(preloadFor(6, 5, 0), "none", "saver does not prefetch the next Short");
assert.equal(preloadFor(4, 5, 0), "none");
assert.equal(preloadFor(7, 5, 2), "auto", "normal mode prefetches within the radius");
assert.equal(preloadFor(8, 5, 2), "none");

assert.equal(dataSaverLabel("on", true), "Data saver: On");
assert.equal(dataSaverLabel("auto", true), "Data saver: Auto (saving now)");
assert.equal(dataSaverLabel("auto", false), "Data saver: Auto");
console.log("Fresh Shorts data saver tests passed.");
