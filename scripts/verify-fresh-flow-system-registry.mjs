import { readFileSync } from "node:fs";

const source = readFileSync("src/features/fresh-flow/core/freshFlowSystemRegistry.ts", "utf8");
const requiredIds = [
  "fresh-shorts", "long-video", "movies-series", "fresh-live", "sports-events",
  "fresh-posts", "communities", "stories", "creator-channels",
  "fresh-music", "fresh-podcasts", "radio-audio-live", "audiobooks",
  "fresh-news", "books-reading", "learn", "research-knowledge",
  "images-art", "vr-ar-spatial", "interactive-experiences", "gaming-esports",
  "fresh-studio", "live-creation", "events-performances",
];
for (const id of requiredIds) {
  if (!source.includes(`id: "${id}"`)) throw new Error(`Fresh Flow system registry missing system: ${id}`);
}

const systemBlock = source.split("export const FRESH_FLOW_INDEPENDENT_SYSTEMS: FreshFlowIndependentSystem[] = [")[1]?.split("\n];")[0];
if (!systemBlock) throw new Error("Fresh Flow independent system list was not found");
const systemIds = [...systemBlock.matchAll(/^\s+\{ id: "([^"]+)", label:/gm)].map((match) => match[1]);
const routePaths = [...systemBlock.matchAll(/routePath: "([^"]+)"/g)].map((match) => match[1]);
if (systemIds.length !== 24) throw new Error(`Expected 24 independent systems, found ${systemIds.length}`);
if (new Set(systemIds).size !== 24) throw new Error("System IDs must be unique");
if (routePaths.length !== 24 || new Set(routePaths).size !== 24) throw new Error("All 24 proposed route paths must be present and unique");
if (!systemBlock.includes('experienceBoundary: "independent"')) throw new Error("Every system must declare an independent experience boundary");
if ((systemBlock.match(/status: "planned"/g) ?? []).length !== 24) throw new Error("All systems must remain planned until independently verified");

const familyBlock = source.split("export const FRESH_FLOW_SYSTEM_FAMILIES")[1]?.split("];")[0] ?? "";
const familyIds = [...familyBlock.matchAll(/^\s+\{ id: "([^"]+)", label:/gm)].map((match) => match[1]);
if (familyIds.length !== 6 || new Set(familyIds).size !== 6) throw new Error("Expected six unique Fresh Flow system families");

const inventory = readFileSync("docs/FRESH_FLOW_24_SYSTEM_ARCHITECTURE.md", "utf8");
for (const token of ["24 independent", "global Fresh Web Lite Home", "Filters/Models", "left-swipe-to-next", "All Systems"]) {
  if (!inventory.includes(token)) throw new Error(`Fresh Flow architecture inventory missing: ${token}`);
}

const home = readFileSync("src/features/fresh-flow/components/FreshFlowHome.tsx", "utf8");
const homeStyles = readFileSync("src/features/fresh-flow/components/FreshFlowHome.css", "utf8");
const systemExperience = readFileSync("src/features/fresh-flow/components/FreshFlowSystemExperience.tsx", "utf8");
const hub = readFileSync("src/features/fresh-flow/FreshFlowHub.tsx", "utf8");
for (const token of ["Discover. Connect. Create.", "What’s happening? Create something...", "Recommended for you", "Example content — not a live feed", "Following", "Messages", "Profile", "All Systems"]) {
  if (!home.includes(token)) throw new Error(`Fresh Flow landing page missing required element: ${token}`);
}
for (const token of ["@media(max-width:720px)", "prefers-reduced-motion", "focus-visible"]) {
  if (!homeStyles.includes(token)) throw new Error(`Fresh Flow landing page missing responsive/accessibility support: ${token}`);
}
for (const token of ["system.label", "system.description", "system.capabilities", "Experience scaffold", "Planned"]) {
  if (!systemExperience.includes(token)) throw new Error(`Independent system experience missing system-specific contract: ${token}`);
}
for (const token of ["<FreshFlowHome", "<FreshFlowShortsExperience", "<FreshFlowSystemExperience", "fresh-flow-system-"]) {
  if (!hub.includes(token)) throw new Error(`Fresh Flow hub missing route integration: ${token}`);
}

console.log("Fresh Flow 24-system architecture and landing UI contract: PASS");
