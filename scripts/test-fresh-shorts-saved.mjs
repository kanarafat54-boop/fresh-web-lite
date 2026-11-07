import assert from "node:assert/strict";
import fs from "node:fs";
import { buildSavedItems, filterSaved } from "../src/features/fresh-flow/core/shortsSaved.ts";

const rows = [
  { short_id: "a", created_at: "2026-11-01T10:00:00Z" },
  { short_id: "b", created_at: "2026-11-03T10:00:00Z" },
  { short_id: "gone", created_at: "2026-11-02T10:00:00Z" },
  { short_id: "a", created_at: "2026-11-04T10:00:00Z" },
  { short_id: "bad", created_at: "not a date" },
  null,
];
const shorts = new Map([["a", { id: "a", author_id: "u1", caption: "Jollof rice tips" }], ["b", { id: "b", author_id: "u2", caption: null }]]);
const names = new Map([["u1", "@amina"]]);
const items = buildSavedItems(rows, shorts, names);

// Newest saved first, one entry per Short, bad rows skipped.
assert.deepEqual(items.map((i) => i.shortId), ["b", "gone", "a"]);
// A deleted or hidden Short stays so the viewer can remove it; it is not shown as a real Short.
const gone = items.find((i) => i.shortId === "gone");
assert.equal(gone.available, false);
assert.equal(gone.caption, null);
assert.equal(gone.creator, null);
// Missing creator profile falls back instead of showing nothing.
assert.equal(items.find((i) => i.shortId === "b").creator, "Creator");
assert.equal(items.find((i) => i.shortId === "a").creator, "@amina");
assert.equal(buildSavedItems([], new Map(), new Map()).length, 0);

// Filtering
assert.equal(filterSaved(items, "").length, 3);
assert.deepEqual(filterSaved(items, "JOLLOF").map((i) => i.shortId), ["a"]);
assert.deepEqual(filterSaved(items, "@amina").map((i) => i.shortId), ["a"]);
assert.deepEqual(filterSaved(items, "zzz"), []);

// The service reads only the viewer's own saves and the sheet reports failures.
const svc = fs.readFileSync(new URL("../src/features/fresh-flow/core/shortsSavedService.ts", import.meta.url), "utf8");
assert.ok(svc.includes('.eq("user_id", userId)'), "saves are scoped to the viewer");
const sheet = fs.readFileSync(new URL("../src/features/fresh-flow/components/ShortsSavedSheet.tsx", import.meta.url), "utf8");
assert.ok(sheet.includes("removeShortInteraction") && sheet.includes("could not remove"), "unsave goes through the interaction adapter and reports failure");
console.log("fresh-shorts-saved: ok");
