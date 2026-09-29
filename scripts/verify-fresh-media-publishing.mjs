import { readFileSync } from "node:fs";
const identity = readFileSync("src/core/platform/mediaIdentity.ts", "utf8");
const bridge = readFileSync("src/core/platform/mediaPublishingBridge.ts", "utf8");
for (const token of ["createMediaIdentity","isPublishableMediaIdentity"]) if (!identity.includes(token)) throw new Error("Missing media identity: "+token);
for (const token of ["createStudioFlowHandoff","sourceUrl","visibility"]) if (!bridge.includes(token)) throw new Error("Missing Studio → Flow bridge: "+token);
console.log("Fresh media publishing bridge: PASS");
