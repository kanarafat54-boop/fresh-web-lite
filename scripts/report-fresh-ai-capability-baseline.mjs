import fs from "node:fs";

const registryPath = "src/core/fresh-ai/FreshAICapabilityRegistry.ts";
const runtimePath = "src/core/fresh-ai/FreshAICapabilityRuntime.ts";
const modelPath = "src/core/fresh-ai/FreshUnifiedModelCore.ts";
const sources = Object.fromEntries(
  [[registryPath, "registry"], [runtimePath, "runtime"], [modelPath, "model"]]
    .map(([path, key]) => {
      if (!fs.existsSync(path)) throw new Error(`Missing capability baseline source: ${path}`);
      return [key, fs.readFileSync(path, "utf8")];
    }),
);

const capabilities = [...sources.registry.matchAll(
  /\["([^"]+)",\s*"([^"]+)",\s*\[([^\]]*)\],\s*"(implemented|contracted|training-required)",\s*(true|false),\s*(true|false)\]/g,
)].map((match) => ({
  id: match[1],
  label: match[2],
  entryPoints: [...match[3].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]),
  declaredStatus: match[4],
  requiresApproval: match[5] === "true",
  requiresVerification: match[6] === "true",
}));

if (!capabilities.length) throw new Error("No Fresh AI capabilities could be parsed from the canonical registry.");
const ids = new Set(capabilities.map((item) => item.id));
if (ids.size !== capabilities.length) throw new Error("Fresh AI capability registry contains duplicate IDs.");

const mappingBlock = sources.runtime.match(/const UNIVERSAL_TO_PRODUCT: Record<string, FreshAICapabilityId> = \{([\s\S]*?)\n\};/);
if (!mappingBlock) throw new Error("Canonical universal-to-product mapping block was not found.");
const mappings = [...mappingBlock[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9_-]*):\s*"([^"]+)",?\s*$/gm)]
  .map((match) => ({ universalCapability: match[1], capabilityId: match[2] }));
const unknownMappings = mappings.filter((mapping) => !ids.has(mapping.capabilityId));
if (unknownMappings.length) {
  throw new Error("Runtime mappings target unknown capabilities: " + unknownMappings.map((item) => item.capabilityId).join(", "));
}

const mappedIds = new Set(mappings.map((mapping) => mapping.capabilityId));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reportKind: "static-source-baseline",
  warning: "Static source inspection is not proof of successful end-to-end or production execution.",
  model: {
    id: sources.model.match(/id:\s*"(fresh-unified-[^"]+)"/)?.[1] ?? "unknown",
    weightsStatus: sources.model.match(/weightsStatus:\s*"([^"]+)"/)?.[1] ?? "unknown",
    productionVerified: false,
  },
  summary: {
    total: capabilities.length,
    declaredImplemented: capabilities.filter((item) => item.declaredStatus === "implemented").length,
    declaredContracted: capabilities.filter((item) => item.declaredStatus === "contracted").length,
    trainingRequired: capabilities.filter((item) => item.declaredStatus === "training-required").length,
    withRuntimeMapping: capabilities.filter((item) => mappedIds.has(item.id)).length,
    withoutRuntimeMapping: capabilities.filter((item) => !mappedIds.has(item.id)).length,
    productionVerified: 0,
  },
  capabilities: capabilities.map((item) => ({
    ...item,
    hasUniversalRuntimeMapping: mappedIds.has(item.id),
    resolverStatusFromContract: item.declaredStatus === "training-required"
      ? "training-required"
      : item.declaredStatus === "implemented" && item.requiresApproval
        ? "approval-required"
        : item.declaredStatus === "implemented" ? "available" : "contracted",
    // The resolver's static contract is not the same as a real successful action.
    endToEndVerified: false,
    productionVerified: false,
    evidence: [registryPath, runtimePath],
  })),
};

const failures = [];
if (report.summary.withoutRuntimeMapping) failures.push("One or more registered capabilities have no universal runtime mapping.");
if (capabilities.some((item) => !item.requiresVerification)) failures.push("Every capability must require verification.");
if (report.model.weightsStatus === "unknown") {
  failures.push("Fresh Unified model weights status could not be determined.");
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Fresh AI capability baseline (static source inspection)");
  console.log(`Model: ${report.model.id}; weights: ${report.model.weightsStatus}`);
  console.log(`Capabilities: ${report.summary.total}; mapped: ${report.summary.withRuntimeMapping}; unmapped: ${report.summary.withoutRuntimeMapping}; production-verified: 0`);
  for (const item of report.capabilities) {
    console.log(`${failures.length ? "CHECK" : "PASS"} ${item.id}: declared=${item.declaredStatus}, resolver=${item.resolverStatusFromContract}, e2e=NOT_VERIFIED, production=NOT_VERIFIED`);
  }
  console.log("NOTE: Resolver status is derived from source contracts; it does not prove provider configuration or successful execution.");
}

if (failures.length) {
  for (const failure of failures) console.error("FAIL: " + failure);
  process.exitCode = 1;
}
