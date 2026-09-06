import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const runtime = read("src/features/shorts/core/FreshShortsRuntime.ts");
const css = read("src/features/fresh-flow/components/FreshFlow.css");
const experience = read("src/features/fresh-flow/components/FreshFlowShortsExperience.tsx");
const hub = read("src/features/fresh-flow/FreshFlowHub.tsx");

assert.match(runtime, /scroll|play/i, "runtime must contain playback orchestration");
assert.match(runtime, /FRESH_SHORTS_PREFETCH_RADIUS\s*=\s*2/);
assert.match(runtime, /FRESH_SHORTS_MAX_RETRIES\s*=\s*2/);
assert.match(runtime, /index === activeIndex/);
assert.match(runtime, /video\.pause\(\)/);
assert.match(runtime, /retryVideo/);

assert.match(css, /scroll-snap-type:\s*y\s+mandatory/);
assert.match(css, /\.fresh-flow-item\s*\{[^}]*flex:0 0 100%/s);
assert.match(css, /touch-action:pan-y/);

assert.match(experience, /setTimeout\(.*5000/s);
assert.match(experience, /video\.paused/);
assert.match(experience, /immersive_enter/);
assert.match(experience, /playback_error/);
assert.match(experience, /buffer_start/);

assert.match(hub, /Home.*Long Videos.*News \/ Posts.*AR \/ VR.*Podcasts.*Others/s);
assert.match(hub, /FreshFlowShortsExperience/);
assert.doesNotMatch(hub, /ShortsModule/);

console.log("Fresh Shorts contract checks passed.");
