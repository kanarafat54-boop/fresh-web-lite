import fs from "node:fs";
const fabric = fs.readFileSync("src/core/fresh-ai/FreshAIUniversalPowerFabric.ts", "utf8");
const vocabulary = fs.readFileSync("src/core/fresh-ai/FreshAIUniversalCapabilityFabric.ts", "utf8");
const router = fs.readFileSync("src/core/fresh-ai/FreshAIUniversalPowerRouter.ts", "utf8");
const everywhere = fs.readFileSync("src/core/fresh-ai/FreshAIEverywhere.ts", "utf8");
const requiredPowers = ["understand", "conversation", "knowledge", "reasoning", "memory", "creation", "execution", "communication", "media", "developer", "automation", "verification", "governance"];
for (const power of requiredPowers) if (!fabric.includes(`id: "${power}"`)) throw new Error(`Missing canonical Fresh AI power: ${power}`);
for (const capability of ["chat", "voice", "research", "create", "code", "design", "image", "video", "audio", "remember", "automate", "verify", "act"]) if (!vocabulary.includes(`"${capability}"`)) throw new Error(`Missing universal capability: ${capability}`);
if (!fabric.includes("resolveFreshAIPower")) throw new Error("Missing Fresh AI power resolver");
if (!router.includes("resolveFreshAIUniversalPowerPlan")) throw new Error("Missing universal power router");
if (!everywhere.includes("usesCanonicalGateway: true")) throw new Error("Fresh AI Everywhere is not aligned to the canonical gateway contract");

// Structural runtime guard: a green name-presence check must not hide malformed powers.
const powerObjects = [...fabric.matchAll(/\{ id:\"([^\"]+)\", name:\"[^\"]+\", domain:\"([^\"]+)\", capabilities:\[([^\]]+)\], source:\"([^\"]+)\", enabled:(true|false) \}/g)];
if (powerObjects.length < requiredPowers.length) throw new Error("Canonical Fresh AI power definitions are incomplete or malformed");
const ids = new Set();
for (const [, id, domain, capabilities, source, enabled] of powerObjects) {
  if (ids.has(id)) throw new Error(`Duplicate canonical Fresh AI power: ${id}`);
  ids.add(id);
  if (!domain || !source || !capabilities.trim()) throw new Error(`Malformed canonical Fresh AI power: ${id}`);
  if (enabled !== "true" && enabled !== "false") throw new Error(`Fresh AI power enabled state is invalid: ${id}`);
}
for (const power of requiredPowers) if (!ids.has(power)) throw new Error(`Canonical Fresh AI power is not structurally registered: ${power}`);

console.log("Fresh AI Universal Capability + Power Fabric contract: PASS");
