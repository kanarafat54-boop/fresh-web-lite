import assert from "node:assert/strict";
import fs from "node:fs";
import { MAX_RECENT, addRecent, cleanQuery, readRecent, removeRecent, writeRecent } from "../src/features/fresh-flow/core/recentSearches.ts";

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), m }; };

// Cleaning
assert.equal(cleanQuery("  hello   world \n"), "hello world");
assert.equal(cleanQuery(""), "");
assert.equal(cleanQuery(null), "");
assert.equal(cleanQuery(42), "");
assert.equal(cleanQuery("x".repeat(500)).length, 80);

// Adding: newest first, case-insensitive dedupe, capped, empty ignored
assert.deepEqual(addRecent(["b", "a"], "c"), ["c", "b", "a"]);
assert.deepEqual(addRecent(["b", "a"], "A"), ["A", "b"]);
assert.deepEqual(addRecent(["b"], "   "), ["b"]);
let list = [];
for (let i = 0; i < 20; i++) list = addRecent(list, `q${i}`);
assert.equal(list.length, MAX_RECENT);
assert.equal(list[0], "q19");

// Removing
assert.deepEqual(removeRecent(["a", "B", "c"], "b"), ["a", "c"]);

// Storage round trip, per scope
const store = memory();
writeRecent("shorts", ["one", "two"], store);
writeRecent("flow", ["other"], store);
assert.deepEqual(readRecent("shorts", store), ["one", "two"]);
assert.deepEqual(readRecent("flow", store), ["other"]);
writeRecent("shorts", [], store);
assert.deepEqual(readRecent("shorts", store), []);
assert.equal(store.m.has("fresh-recent-searches-shorts"), false, "clearing removes the key");

// Corrupt or hostile stored data never breaks search
for (const bad of ["not json", "{}", "123", "null", '[1,{"a":1},null]']) {
  const s = memory(); s.setItem("fresh-recent-searches-shorts", bad);
  assert.deepEqual(readRecent("shorts", s), []);
}
// Storage that throws, or no storage at all, falls back to memory only
const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
assert.deepEqual(readRecent("shorts", throwing), []);
assert.deepEqual(writeRecent("shorts", ["a"], throwing), ["a"]);
assert.deepEqual(readRecent("shorts", null), []);

// The search surface records, shows and lets the viewer clear them
const ui = fs.readFileSync(new URL("../src/features/fresh-flow/components/FreshFlowSearchSurface.tsx", import.meta.url), "utf8");
assert.ok(ui.includes("addRecent") && ui.includes("Clear recent searches") && ui.includes("Remove recent search"), "search surface wires add, remove and clear");
console.log("fresh-recent-searches: ok");
