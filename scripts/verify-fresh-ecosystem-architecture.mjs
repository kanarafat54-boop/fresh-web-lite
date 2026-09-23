import fs from "node:fs";

const catalogPath = "src/core/platform/freshEcosystemCatalog.ts";
const corePath = "src/core/fresh-core/ecosystemRegistry.ts";
const homePath = "src/core/platform/freshHomeDirections.ts";

for (const file of [catalogPath, corePath, homePath]) {
  if (!fs.existsSync(file)) throw new Error(`Missing architecture file: ${file}`);
}

const catalog = fs.readFileSync(catalogPath, "utf8");
const majorMatch = catalog.match(/export const FRESH_MAJOR_ECOSYSTEMS[\\s\\S]*?\\n\\];/);
if (!majorMatch) throw new Error("Canonical major ecosystem catalog not found");

const majorIds = [...majorMatch[0].matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
if (majorIds.length < 32) throw new Error(`Expected at least 32 major ecosystems, found ${majorIds.length}`);

const surfaceMatch = catalog.match(/export const FRESH_ECOSYSTEM_SURFACES[\\s\\S]*?\\n\\];/);
if (!surfaceMatch) throw new Error("Canonical ecosystem surface catalog not found");

const surfaceIds = [...surfaceMatch[0].matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
const surfacedMajorIds = new Set([...surfaceMatch[0].matchAll(/majorEcosystemId: "([^"]+)"/g)].map((m) => m[1]));
const missing = majorIds.filter((id) => !surfacedMajorIds.has(id));

if (missing.length) {
  throw new Error(`Major ecosystems without a surface mapping: ${missing.join(", ")}`);
}

const core = fs.readFileSync(corePath, "utf8");
if (!core.includes("FRESH_MAJOR_ECOSYSTEMS")) throw new Error("Fresh Core is not consuming the canonical catalog");

const home = fs.readFileSync(homePath, "utf8");
if (!home.includes("getDirectionEcosystems")) throw new Error("Home directions are not resolving through the canonical catalog");

console.log(`Fresh ecosystem architecture OK: ${majorIds.length} major ecosystems, ${surfaceIds.length} surfaces, 0 unmapped majors.`);
