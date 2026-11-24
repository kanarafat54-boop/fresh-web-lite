import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const service = read("src/features/fresh-flow/core/searchService.ts");
const surface = read("src/features/fresh-flow/components/FreshFlowSearchSurface.tsx");

// Run the real grouping function from source (types stripped), not a copy.
const start = service.indexOf("export function groupSoundRows");
const end = service.indexOf("\n}\n", start) + 3;
assert.ok(start > 0 && end > start, "groupSoundRows must exist in searchService.ts");
const code = stripTypeScriptTypes(service.slice(start, end)).replace("export function", "function");
const groupSoundRows = new Function(`${code}; return groupSoundRows;`)();

const rows = [
  { sound_name: "Lake Vibes" }, { sound_name: " Lake Vibes " }, { sound_name: "Kampala Night" },
  { sound_name: null }, { sound_name: "" }, {}, { sound_name: "Kampala Night" }, { sound_name: "Lake Vibes" },
];
const grouped = groupSoundRows(rows, 10, false);
assert.deepEqual(grouped, [
  { name: "Lake Vibes", useCount: 3, capped: false },
  { name: "Kampala Night", useCount: 2, capped: false },
], "groups by trimmed name, drops empty, sorts by use then name");
assert.equal(groupSoundRows(rows, 1, true).length, 1, "respects the limit");
assert.equal(groupSoundRows(rows, 1, true)[0].capped, true, "propagates the capped flag");
assert.deepEqual(groupSoundRows([], 5, false), []);

// Query safety and real-data rules.
assert.match(service, /\.ilike\("sound_name"/, "sound search uses a single parameterised ilike, not a raw .or() string");
assert.match(service, /replace\(\/\[\\\\%_\]\/g/, "LIKE wildcards in the query are escaped");
assert.match(service, /keepVisibleAuthors\(data \?\? \[\], \(r: any\) => String\(r\.author_id\)\)/, "blocked/hidden creators are filtered");

// Discoverability: existing tabs are all preserved and Sounds is added and wired to the existing sound page.
for (const id of ["videos", "posts", "news", "web", "people", "topics"]) assert.match(surface, new RegExp(`id: "${id}"`), `tab ${id} must remain`);
assert.match(surface, /id: "sounds", label: "Sounds"/);
assert.match(surface, /searchSounds\(q\)/);
assert.match(surface, /<ShortsTopicPage kind="sound"/);
console.log("Fresh search Sounds category: PASS");
