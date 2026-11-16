import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const systems = readFileSync("src/features/fresh-flow/core/freshFlowSystemRegistry.ts", "utf8");
const integration = readFileSync("src/features/fresh-flow/core/freshFlowStudioIntegration.ts", "utf8");
const studioTypes = readFileSync("src/features/fresh-studio/shared/types.ts", "utf8");

const systemBlock = systems.split("export const FRESH_FLOW_INDEPENDENT_SYSTEMS: FreshFlowIndependentSystem[] = [")[1]?.split("\n];")[0];
assert.ok(systemBlock, "Fresh Flow independent system registry exists");
const systemIds = [...systemBlock.matchAll(/^\s+\{ id: "([^"]+)", label:/gm)].map((m) => m[1]);
const profileBlock = integration.split("export const FRESH_FLOW_STUDIO_PROFILES: readonly FreshFlowStudioProfile[] = [")[1]?.split("\n] as const;")[0];
assert.ok(profileBlock, "Studio integration profiles exist");
const profileIds = [...profileBlock.matchAll(/systemId: "([^"]+)"/g)].map((m) => m[1]);

assert.equal(systemIds.length, 24, "exactly 24 independent systems are registered");
assert.equal(profileIds.length, 24, "every independent system has a Studio profile");
assert.equal(new Set(profileIds).size, 24, "each system has exactly one Studio profile");
assert.deepEqual([...profileIds].sort(), [...systemIds].sort(), "profile IDs match the system registry exactly");

const validKinds = ["video", "image", "audio", "podcast", "animation3d", "design", "live", "custom"];
const validWorkspaces = ["video", "image", "audio", "podcast", "animation", "design", "live", "custom"];
const profileLines = profileBlock.split("\n").filter((line) => line.includes("{ systemId:"));
for (const line of profileLines) {
  const kind = line.match(/mediaKind: "([^"]+)"/)?.[1];
  const workspace = line.match(/workspace: "([^"]+)"/)?.[1];
  const implementation = line.match(/implementation: "([^"]+)"/)?.[1];
  assert.ok(validKinds.includes(kind), `valid Studio media kind: ${kind}`);
  assert.ok(validWorkspaces.includes(workspace), `valid Studio workspace: ${workspace}`);
  assert.ok(["existing-foundation", "partial-foundation", "domain-work-required", "provider-required", "device-required"].includes(implementation), `explicit implementation status: ${implementation}`);
  assert.match(line, /intents: \[[^\]]+\]/, "each profile exposes creation intents");
  assert.match(line, /capabilities: \[[^\]]+\]/, "each profile declares capability dependencies");
  assert.match(line, /sharedServices: \[[^\]]+\]/, "each profile declares shared Studio services");
}
for (const kind of validKinds) assert.ok(studioTypes.includes(`"${kind}"`), `Studio supports media kind ${kind}`);
for (const token of ["getFreshFlowStudioProfile", "getFreshFlowStudioProfilesByWorkspace", "resolveStudioKindForFreshFlowSystem", "freshFlowStudioProjectContext"]) {
  assert.ok(integration.includes(token), `integration API exists: ${token}`);
}
assert.match(integration, /does not claim that a provider, editor, or publishing destination is live/i);
console.log("Fresh Flow → Creator Studio domain integration: PASS (24/24 systems)");
