import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Bundle the real TypeScript module so these tests exercise production comparison logic.
const tempDir = await mkdtemp(join(tmpdir(), "truemode-claim-tests-"));
try {
  const result = await build({
    entryPoints: ["src/core/semantic/claimIntelligence.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "bundle",
  });
  const modulePath = join(tempDir, "claimIntelligence.mjs");
  await writeFile(modulePath, result.outputFiles[0].text, "utf8");
  const { compareClaims } = await import(pathToFileURL(modulePath).href);
  const claim = (id, subjectEntityId, predicate, object, statement = `${predicate} ${object}`) => ({
    id, subjectEntityId, predicate, object, statement,
    normalizedStatement: statement.toLowerCase(),
    observedAt: "2026-10-15T00:00:00.000Z",
    confidence: 0.9,
  });

  // Explicit opposite predicates on the same entity remain a real contradiction.
  assert.equal(compareClaims(
    claim("a", "entity-1", "supports", "proposal alpha"),
    claim("b", "entity-1", "opposes", "proposal alpha")
  ).relation, "contradictory");

  // Generic labels alone must not make distinct findings contradictory.
  assert.notEqual(compareClaims(
    claim("c", "entity-1", "research_finding", "rainfall increased", "rainfall increased in district north"),
    claim("d", "entity-1", "research_finding", "school attendance improved", "school attendance improved in district south")
  ).relation, "contradictory");

  // Different resolved entities must never conflict, even with opposing predicates.
  assert.equal(compareClaims(
    claim("e", "entity-1", "supports", "proposal alpha"),
    claim("f", "entity-2", "opposes", "proposal alpha")
  ).relation, "unrelated");

  // Generic predicate-only similarity with unrelated objects should not trigger contradiction.
  assert.notEqual(compareClaims(
    claim("g", "entity-1", "claim", "coastal erosion", "claim coastal erosion"),
    claim("h", "entity-1", "claim", "solar adoption", "claim solar adoption")
  ).relation, "contradictory");

  // Identical propositions should remain classified as the same claim.
  assert.equal(compareClaims(
    claim("i", "entity-1", "founded", "company z"),
    claim("j", "entity-1", "founded", "company z")
  ).relation, "same");

  console.log("TRUEMODE claim-comparison behavior tests: PASS (5 cases)");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
