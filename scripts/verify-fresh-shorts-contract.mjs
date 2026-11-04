import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const runtime = read("src/features/shorts/core/FreshShortsRuntime.ts");
const css = read("src/features/fresh-flow/components/FreshFlow.css");
const experience = read("src/features/fresh-flow/components/FreshFlowShortsExperience.tsx");
const hub = read("src/features/fresh-flow/FreshFlowHub.tsx");
const architecture = read("src/features/fresh-flow/core/freshFlowArchitecture.ts");

assert.match(runtime, /scroll|play/i, "runtime must contain playback orchestration");
assert.match(runtime, /FRESH_SHORTS_PREFETCH_RADIUS\s*=\s*2/);
assert.match(runtime, /FRESH_SHORTS_MAX_RETRIES\s*=\s*2/);
assert.match(runtime, /index === activeIndex/);
assert.match(runtime, /video\.pause\(\)/);
assert.match(runtime, /retryVideo/);

assert.match(css, /scroll-snap-type:\s*y\s+mandatory/);
assert.match(css, /\.fresh-flow-item\s*\{[^}]*flex:0 0 100%/s);
assert.match(css, /touch-action:pan-y/);

// Shorts is a TikTok-style pager: no timed "immersive" takeover, no extra Create/Gift buttons.
assert.doesNotMatch(experience, /immersive_enter|fresh-flow-create-fab|fresh-flow-quick-gift|fresh-flow-immersive-back/);
const stream = read("src/features/fresh-flow/components/FreshFlowShortsStream.tsx");
for (const token of ["fresh-flow-tap-layer", "fresh-flow-progress-fill", "handleTap", "handleSave", "handleShare", "handleRepost", "WatchTracker", "className=\"fresh-flow-video\""]) assert.ok(stream.includes(token), `stream missing ${token}`);
assert.doesNotMatch(stream, /Gaming Live|fresh-flow-picks/, "no fabricated Picks rail");
assert.match(css, /\.fresh-flow-stream\[data-discovery\] \.fresh-flow-viewport\{[^}]*position:absolute[^}]*scroll-snap-type:y mandatory/);
assert.match(css, /\.fresh-flow-stream\[data-discovery\] \.fresh-flow-item\{[^}]*border-radius:0/);
assert.match(experience, /playback_error/);
assert.match(experience, /buffer_start/);

// The six-world architecture is defined in the architecture contract, not duplicated
// as presentation text inside the Hub. Validate the canonical source instead.
assert.match(architecture, /Fresh Short.*Long Videos.*News \/ Posts.*VR \/ AR.*Podcasts.*Others/s);
assert.match(hub, /FreshFlowShortsExperience/);
assert.doesNotMatch(hub, /ShortsModule/);

console.log("Fresh Shorts contract checks passed.");
