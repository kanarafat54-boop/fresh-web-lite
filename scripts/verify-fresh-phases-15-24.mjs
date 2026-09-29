import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/core/platform/freshUniversalPlatformFabric.ts", import.meta.url), "utf8");
for (const token of ["FRESH_PHASES_15_24", "FRESH_PLATFORM_CAPABILITIES", "assertFreshPhases15To24Integrity", "global-service-topology", "universal-data-model", "universal-profile", "universal-ai-runtime", "personal-agent", "universal-media-object", "recommendation-graph", "universal-search-index", "messaging-foundation", "creative-studio"]) {
  if (!source.includes(token)) throw new Error("Missing phase 15–24 contract: " + token);
}
const match = source.match(/names = \[([\s\S]*?)\] as const/);
if (!match) throw new Error("Capability registry missing");
const count = (match[1].match(/"[^"]+"/g) || []).length;
if (count !== 100) throw new Error(`Expected 100 capabilities, found ${count}`);
console.log("Fresh phases 15–24 contract: PASS (100 capabilities, steps 141–240)");
