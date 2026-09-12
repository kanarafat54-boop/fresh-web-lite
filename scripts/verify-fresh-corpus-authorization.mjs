import { readFile } from "node:fs/promises";

const registry = JSON.parse(await readFile("training/fresh_corpus_authorizations.json", "utf8"));
if (registry.schema !== "fresh-corpus-authorization-registry-v1") throw new Error("invalid authorization registry schema");
if (registry.policy?.unknownIsBlocked !== true) throw new Error("unknown sources must be blocked");
if (registry.policy?.trainingPermissionRequired !== true) throw new Error("training permission must be required");
if (registry.policy?.evidenceRequired !== true) throw new Error("evidence must be required");
if (!Array.isArray(registry.sources) || registry.sources.length === 0) throw new Error("no authorized sources registered");
const ids = new Set();
for (const source of registry.sources) {
  if (!source.authorizationId || ids.has(source.authorizationId)) throw new Error("duplicate/missing authorization ID");
  ids.add(source.authorizationId);
  if (source.status !== "eligible") throw new Error(`source ${source.authorizationId} is not eligible`);
  if (source.trainingPermission !== "verified") throw new Error(`source ${source.authorizationId} lacks verified training permission`);
  if (!source.evidenceRef) throw new Error(`source ${source.authorizationId} lacks evidence reference`);
  if (!source.license) throw new Error(`source ${source.authorizationId} lacks license`);
}
console.log(`Fresh corpus authorization registry: PASS (${registry.sources.length} eligible source)`);
console.log("No-evidence/no-permission sources remain blocked.");
