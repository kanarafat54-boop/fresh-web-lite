import assert from "node:assert/strict";
import { splitCaption } from "../src/features/fresh-flow/core/shortsCaption.ts";
const segs = splitCaption("Pouring #concrete today #Ça_va! done");
assert.deepEqual(segs.filter((s) => s.tag).map((s) => s.tag), ["concrete", "Ça_va"]);
assert.equal(segs.map((s) => s.text).join(""), "Pouring #concrete today #Ça_va! done");
assert.deepEqual(splitCaption("no tags here"), [{ text: "no tags here" }]);
assert.deepEqual(splitCaption("a # b"), [{ text: "a # b" }]);
console.log("fresh-shorts-topics: ok");
