import fs from "node:fs";

const native = fs.readFileSync("src/core/fresh-ai/FreshNativeDimensionalEngines.ts", "utf8");
const fabric = fs.readFileSync("src/core/fresh-ai/FreshNativeGenerationFabric.ts", "utf8");
const router = fs.readFileSync("src/core/fresh-ai/FreshAIUniversalPowerRouter.ts", "utf8");
const power = fs.readFileSync("src/core/fresh-ai/FreshAIUniversalPowerFabric.ts", "utf8");
const ask = fs.readFileSync("api/ai/ask.ts", "utf8");

for (const dimension of Array.from({ length: 11 }, (_, i) => i + 1)) {
  if (!native.includes(`dimension:${dimension}`) && !native.includes(`case ${dimension}:`)) {
    throw new Error(`Missing executable native ${dimension}D contract`);
  }
}
for (const required of [
  "Fresh Native 1D Signal Engine", "Fresh Native 2D Composition Engine", "Fresh Native 3D Geometry Engine",
  "Fresh Native 4D Temporal Engine", "Fresh Native 5D Scenario Engine", "Fresh Native 6D State-Space Engine",
  "Fresh Native 7D Causal Engine", "Fresh Native 8D Uncertainty Engine", "Fresh Native 9D Knowledge Engine",
  "Fresh Native 10D Meta-Reasoning Engine", "Fresh Native 11D Mission Engine",
  "FRESH_NATIVE_DIMENSIONAL_ENGINES", "generateFreshNativeDimensionalArtifact",
]) if (!native.includes(required)) throw new Error(`Native engine contract missing: ${required}`);
for (const required of ["Fresh Native Generation Fabric", "providerIndependent: true", "generateFreshNative", "assertFreshNativeGenerationFabricIntegrity"]) {
  if (!fabric.includes(required)) throw new Error(`Native generation fabric contract missing: ${required}`);
}
if (!power.includes('domain:"native-generation"') || !power.includes('id:"native-generation"')) throw new Error("Native generation is not a first-class Fresh AI power");
if (!router.includes("resolveFreshNativeGeneration") || !router.includes('powers.unshift("native-generation")')) throw new Error("Universal power router does not prioritize native generation");
if (!ask.includes("generateFreshNativeDimensionalArtifact") || !ask.includes('provider: "fresh-native"') || !ask.includes('native: true')) throw new Error("Canonical /api/ai/ask native route is incomplete");
if (native.includes("OPENAI_API_KEY") || native.includes("GEMINI_API_KEY") || native.includes("fetch(")) throw new Error("Native dimensional engines must remain provider-independent and network-free");
console.log("Fresh native dimensional 1D–11D contract: PASS");
