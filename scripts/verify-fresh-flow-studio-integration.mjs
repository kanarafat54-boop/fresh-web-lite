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

const projectService = readFileSync("src/features/fresh-studio/projects/projectService.ts", "utf8");
const projectMapping = readFileSync("src/features/fresh-studio/projects/projectMapping.ts", "utf8");
const createProject = readFileSync("src/features/fresh-studio/projects/CreateProject.tsx", "utf8");
const studioApp = readFileSync("src/features/fresh-studio/FreshStudioApp.tsx", "utf8");
const systemExperience = readFileSync("src/features/fresh-flow/components/FreshFlowSystemExperience.tsx", "utf8");
const flowHub = readFileSync("src/features/fresh-flow/FreshFlowHub.tsx", "utf8");
for (const [source, token, label] of [
  [projectService, "sourceSystemId", "project creation accepts the source system"],
  [projectService, "sourceSystemId ?? null", "project creation persists source system metadata"],
  [projectMapping, "stored?.sourceSystemId", "project loading restores source system metadata"],
  [createProject, "resolveStudioKindForFreshFlowSystem", "domain entry resolves to a Studio media kind"],
  [createProject, "sourceSystemId });", "created project retains domain origin"],
  [studioApp, "initialSystemId", "Studio receives the originating domain"],
  [systemExperience, "onOpenStudio(system.id)", "each system launches Studio with its own origin"],
  [flowHub, "setStudioSourceSystemId(systemId ?? null)", "Flow carries domain origin into Studio"],
]) assert.ok(source.includes(token), label);
console.log("Fresh Flow → Creator Studio creation-origin handoff: PASS");

const shortsExperience = readFileSync("src/features/fresh-flow/components/FreshFlowShortsExperience.tsx", "utf8");
assert.match(shortsExperience, /onOpenStudio\("fresh-shorts"\)/, "Shorts create intent identifies Fresh Shorts as its Studio source system");
assert.match(flowHub, /setStudioSourceSystemId\(systemId\)/, "Fresh Flow preserves the originating system when opening Studio");
assert.match(studioApp, /sourceSystemId: initialSystemId \?\? undefined/, "Studio receives the originating system ID");
assert.match(studioApp, /section: readCreateIntent\(\) \? "publish" : "home"/, "a Shorts create intent resumes at the shared Studio publishing workflow");
assert.match(shortsExperience, /sourceAuthorId\?: string; sourceVideoUrl\?: string; sourceCaption\?: string/, "Shorts create intents retain creator, media and caption context");
console.log("Fresh Shorts → shared Creator Studio create-intent handoff: PASS");
