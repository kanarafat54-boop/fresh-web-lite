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
  "provider-required",
  "device-required",
  "rightsPolicy",
  "accessibility",
  "structuredClone",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Fresh Flow capability registry contract missing: ${token}`);
}
if (/type\s+\w*(MediaType|CapabilityId)\s*=\s*[\s\S]{0,200}\|/.test(source)) {
  throw new Error("Capability identifiers must remain open-ended, not a closed union");
}
if (!source.includes("existing.version >= value.version")) {
  throw new Error("Capability registration must reject duplicate or older versions");
}
if (!source.includes("client-supplied") && !source.includes("server must authorize each operation")) {
  throw new Error("Capability metadata must not be treated as authorization");
}
console.log("Fresh Flow extensible capability registry contract: PASS");
