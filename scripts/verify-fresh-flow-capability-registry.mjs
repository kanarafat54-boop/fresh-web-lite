import { readFileSync } from "node:fs";

const source = readFileSync("src/features/fresh-flow/core/freshFlowCapabilityRegistry.ts", "utf8");
const required = [
  "FreshFlowCapabilityDescriptor",
  "export type FreshFlowMediaAction = string;",
  "invalid action identifier",
  "FreshFlowCapabilityRegistry",
  "validateFreshFlowCapability",
  "FRESH_FLOW_BASE_CAPABILITIES",
  "media.text",
  "media.image",
  "media.audio",
  "media.video",
  "media.live",
  "media.spatial",
  "media.interactive",
  "media.data",
  "media.composite",
  "media.executable",
  "media.live-event",
  "provider-required",
  "device-required",
  "rightsPolicy",
  "accessibility",
  "structuredClone",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Fresh Flow capability registry contract missing: ${token}`);
}
const sharedContracts = readFileSync("src/features/fresh-flow/core/freshFlowContracts.ts", "utf8");
if (!sharedContracts.includes("KnownFreshFlowMediaType") || !sharedContracts.includes("FreshFlowMediaType = KnownFreshFlowMediaType | (string & {})")) {
  throw new Error("Shared runtime media types must preserve built-in autocomplete and accept future identifiers");
}
if (!source.includes("existing.version >= value.version")) {
  throw new Error("Capability registration must reject duplicate or older versions");
}
if (!source.includes("client-supplied") && !source.includes("server must authorize each operation")) {
  throw new Error("Capability metadata must not be treated as authorization");
}
const registrySource = source;
for (const id of [
  "media.interactive",
  "media.data",
  "media.composite",
  "media.executable",
  "media.live-event",
]) {
  if (!registrySource.includes(`id: "${id}"`)) throw new Error(`Missing open-world capability family: ${id}`);
}
for (const token of ["metadata-preview-only", "non-executable-preview", "safe-data-visualization-renderer", "media-track-orchestration"]) {
  if (!registrySource.includes(token)) throw new Error(`Missing safe fallback/adapter contract: ${token}`);
}
console.log("Fresh Flow extensible capability registry contract: PASS");
