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
for (const token of ["Discover. Connect. Create.", "What’s happening? Create something...", "Recommended for you", "Example content — not a live feed", "All Systems"]) {
  if (!home.includes(token)) throw new Error(`Fresh Flow landing page missing required element: ${token}`);
}
if (!home.includes('onOpenSystem("fresh-shorts")')) {
  throw new Error("Fresh Flow recommendations must link to the Shorts experience");
}
if (home.includes('<small>Following</small>') || home.includes('aria-label="Choose your feed"') || home.includes('fresh-flow-home-bottom-nav')) {
  throw new Error("Fresh Flow must not duplicate navigation at the bottom of the landing page");
}
for (const token of [">Live</button>", ">VR / AR</button>", ">Podcasts</button>", ">Music</button>", ">Others</button>", "fresh-flow-unified-profile", "flowAvatarInputRef", "flowCameraInputRef", "setActiveRoute(\"profile\")"]) {
  if (!hub.includes(token)) throw new Error(`Fresh Flow masthead is missing a required destination or profile action: ${token}`);
}
const bottomNav = readFileSync("src/app/components/BottomNav.tsx", "utf8");
for (const token of ["fresh-flow-bottom-nav", "label: \"Home\"", "label: \"Shorts\"", "label: \"Creator Studio\"", "label: \"Video\"", "label: \"Messages\"", "label: \"Fresh Mail\"", 'id: "fresh-mail"']) {
  if (!bottomNav.includes(token)) throw new Error(`Fresh Flow bottom navigation is missing: ${token}`);
}
if (home.includes("fresh-flow-home-shortcuts") || hub.includes(">Flow Home</button>") || hub.includes(">News</button>") || hub.includes(">Posts</button>")) {
  throw new Error("Fresh Flow must not duplicate the Flow Home button or top-level News/Posts navigation");
}
for (const token of ["@media(max-width:720px)", "prefers-reduced-motion", "focus-visible"]) {
  if (!homeStyles.includes(token)) throw new Error(`Fresh Flow landing page missing responsive/accessibility support: ${token}`);
}
for (const token of ["system.label", "system.description", "system.capabilities", "LiveWorkspace", "MusicWorkspace", "Discover live", "Safety & controls", "Create playlist", "fresh-music-playlists", "service connection"]) {
  if (!systemExperience.includes(token)) throw new Error(`Independent system experience missing system-specific contract or feature: ${token}`);
}
const mediaWorkspace = readFileSync("src/features/fresh-flow/components/FreshFlowMediaWorkspace.tsx", "utf8");
for (const token of ["Start AR", "Object Library", "Learn AR/VR", "setSpatialTool", "fresh-flow-vr-tool-panel"]) {
  if (!mediaWorkspace.includes(token)) throw new Error(`VR/AR workspace missing actionable feature: ${token}`);
}
for (const token of ['setActiveRoute("fresh-flow-system-fresh-music")', "onClick={goBack}", "<FreshFlowHome", "<FreshFlowShortsExperience", "<FreshFlowSystemExperience", "fresh-flow-system-"]) {
  if (!hub.includes(token)) throw new Error(`Fresh Flow hub missing route integration: ${token}`);
}

const featureRegistry = readFileSync("src/app/registry/FeatureRegistry.ts", "utf8");
const freshMailWorkspace = readFileSync("src/features/workspaces/FreshMailWorkspace.tsx", "utf8");
for (const token of ['id: "fresh-mail"', 'route: "/fresh-mail"', 'FreshMailWorkspace']) {
  if (!featureRegistry.includes(token)) throw new Error(`Fresh Mail must have its own registered destination: ${token}`);
}
for (const token of ["FreshMailPanel", 'setActiveRoute("fresh-flow")', "Fresh Mail"]) {
  if (!freshMailWorkspace.includes(token)) throw new Error(`Fresh Mail workspace is missing a required element: ${token}`);
}

console.log("Fresh Flow 24-system architecture and landing UI contract: PASS");
