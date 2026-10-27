import { readFileSync } from "node:fs";

const source = readFileSync("src/features/fresh-flow/core/freshFlowSystemRegistry.ts", "utf8");
const required = [
  "FRESH_FLOW_SYSTEM_FAMILIES",
  "FRESH_FLOW_INDEPENDENT_SYSTEMS",
  "FreshFlowIndependentSystem",
  "validateFreshFlowSystemRegistry",
  "fresh-shorts",
  "long-video",
  "movies-series",
  "fresh-live",
  "sports-events",
  "fresh-posts",
  "communities",
  "stories",
  "creator-channels",
  "fresh-music",
  "fresh-podcasts",
  "radio-audio-live",
  "audiobooks",
  "fresh-news",
  "books-reading",
  "learn",
  "research-knowledge",
  "images-art",
  "vr-ar-spatial",
  "interactive-experiences",
  "gaming-esports",
  "fresh-studio",
  "live-creation",
  "events-performances",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Fresh Flow system registry contract missing: ${token}`);
}
if (!source.includes('experienceBoundary: "independent"')) {
  throw new Error("Every system must declare an independent experience boundary");
}
if (!source.includes('status: "planned"')) {
  throw new Error("System status must not imply implementation without evidence");
}
const inventory = readFileSync("docs/FRESH_FLOW_24_SYSTEM_ARCHITECTURE.md", "utf8");
for (const token of ["24 independent", "Global Fresh Web Lite Home", "Filters/Models", "left-swipe-to-next", "All Systems"]) {
  if (!inventory.includes(token)) throw new Error(`Fresh Flow architecture inventory missing: ${token}`);
}
console.log("Fresh Flow 24-system architecture contract: PASS");
