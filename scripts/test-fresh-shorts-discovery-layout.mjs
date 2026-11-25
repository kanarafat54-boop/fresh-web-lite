import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const stream = read("src/features/fresh-flow/components/FreshFlowShortsStream.tsx");
const hub = read("src/features/fresh-flow/FreshFlowHub.tsx");
const css = read("src/features/fresh-flow/components/FreshFlow.css");

const primary = stream.match(/const PRIMARY_SUB_TAB_ORDER: SubTab\[\] = \[([^\]]+)\];/)?.[1] ?? "";
const secondary = stream.match(/const SECONDARY_SUB_TAB_ORDER: SubTab\[\] = \[([^\]]+)\];/)?.[1] ?? "";
assert.deepEqual([...primary.matchAll(/"([^"]+)"/g)].map((m) => m[1]), ["more", "learn", "relax", "for-you"]);
assert.deepEqual([...secondary.matchAll(/"([^"]+)"/g)].map((m) => m[1]), ["trending", "friends", "following"]);
assert.match(stream, /fresh-flow-tabs-primary[\s\S]*?PRIMARY_SUB_TABS\.map/);
assert.match(stream, /fresh-flow-tabs-secondary[\s\S]*?SECONDARY_SUB_TABS\.map/);
assert.match(hub, /isOverview && \([\s\S]*?fresh-shorts-bell[\s\S]*?fresh-shorts-add[\s\S]*?fresh-shorts-camera[\s\S]*?fresh-flow-unified-profile/);
assert.match(hub, /shortsNotificationsOpen && isOverview/);
assert.match(css, /\.fresh-flow-tabs-secondary\s*\{/);
assert.match(css, /\.fresh-flow-tabs-secondary button\s*\{/);
console.log("Fresh Shorts two-row discovery and Home-header ownership: PASS");
