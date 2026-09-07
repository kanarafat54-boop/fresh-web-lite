import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/features/fresh-flow/core/shortsPerformance.ts", import.meta.url), "utf8");

// Keep the performance policy honest: the active item is prioritized, slow
// connections can downgrade preloading, and distant resources are released.
assert.match(source, /priority:\s*"active"/);
assert.match(source, /preload:\s*slowConnection\s*\?\s*"metadata"\s*:\s*"auto"/);
assert.match(source, /preload:\s*"none"/);
assert.match(source, /function getShortsResourceWindow/);
assert.match(source, /radius\s*=\s*2/);
assert.match(source, /Math\.abs\(position - activeIndex\)/);

console.log("Fresh Flow performance contract: PASS");
