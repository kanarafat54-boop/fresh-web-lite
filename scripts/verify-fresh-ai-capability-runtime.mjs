import fs from "node:fs";
const runtime = fs.readFileSync("src/core/fresh-ai/FreshAICapabilityRuntime.ts", "utf8");
const gateway = fs.readFileSync("src/core/fresh-ai/FreshAIIntelligenceGateway.ts", "utf8");
const registry = fs.readFileSync("src/core/fresh-ai/FreshAICapabilityRegistry.ts", "utf8");
const services = fs.readFileSync("src/core/fresh-ai/FreshAIServerServices.ts", "utf8");
const workspace = fs.readFileSync("src/core/fresh-ai/FreshAIWorkspaceContext.ts", "utf8");
const stream = fs.readFileSync("api/ai/stream.ts", "utf8");

for (const required of [
  "resolveFreshAICapabilityRuntime",
  "resolveFreshAICapabilityRuntimeSet",
  "assertFreshAICapabilityRuntimeIntegrity",
  "UNIVERSAL_TO_PRODUCT",
  "contracted",
  "training-required",
  "approval-required",
  "executeFreshFileUpload",
  "persistFreshAIMedia",
]) if (!runtime.includes(required)) throw new Error(`Missing capability runtime contract: ${required}`);

for (const mapping of [
  'understand: "conversation"',
  'write: "creation"',
  'chat: "conversation"',
  'files: "files"',
]) if (!runtime.includes(mapping)) throw new Error(`Missing canonical universal capability mapping: ${mapping}`);

if (!runtime.includes('kind: "file"')) throw new Error("Files runtime does not use the file persistence boundary");
if (!runtime.includes('modelId: "fresh-unified-1"')) throw new Error("Files runtime is not attributed to Fresh unified identity");
if (!services.includes('kind: "image" | "video" | "audio" | "file"')) throw new Error("Server services do not expose file persistence");
if (!services.includes("requires an authenticated user")) throw new Error("File persistence lacks authentication boundary");
if (!gateway.includes("resolveFreshAICapabilityRuntimeSet")) throw new Error("Gateway does not resolve capability runtime state");
if (!gateway.includes("capabilityRuntime")) throw new Error("Gateway does not expose capability runtime state");
if (!gateway.includes("if(r.execute===true&&plan.length)")) throw new Error("Gateway does not guard execution against unavailable capabilities");
if (!gateway.includes("!capability.executable")) throw new Error("Gateway does not fail closed on non-executable capabilities");
if (!gateway.includes("Requested Fresh AI capability is not executable")) throw new Error("Gateway missing fail-closed capability error");
if (!registry.includes('["files", "Files", ["files"], "implemented"')) throw new Error("Files capability is not marked implemented");
if (!registry.includes("assertFreshAICapabilityRegistryIntegrity")) throw new Error("Capability registry integrity guard is missing");

if (!workspace.includes('id: "fresh-unified-1"')) throw new Error("Workspace does not expose the sovereign unified model identity");
if (!workspace.includes('activeModelId: "fresh-unified-1"')) throw new Error("Workspace active model is not the sovereign unified model");
if (workspace.includes('id: "gemini-2.5-flash"')) throw new Error("Fresh workspace still exposes Gemini as a native model");
if (!stream.includes('model: FRESH_UNIFIED_MODEL.id')) throw new Error("Fresh AI stream does not invoke the canonical unified model identity");
if (!stream.includes('const modelId = result.universal?.modelId ?? FRESH_UNIFIED_MODEL.id')) throw new Error("Fresh AI stream does not persist the canonical model identity");

for (const id of ["voice", "vision", "files", "data", "code", "projects", "knowledge", "skills", "apps", "work", "tasks", "library", "automation", "media-3d"]) {
  if (!runtime.includes(`"${id}"`)) throw new Error(`Missing runtime mapping target: ${id}`);
}

console.log("Fresh AI capability runtime + sovereign workspace wiring contract: PASS");
