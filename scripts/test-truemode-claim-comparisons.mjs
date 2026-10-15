import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Bundle the real TypeScript modules so tests exercise production comparison and truth-decision logic.
const tempDir = await mkdtemp(join(tmpdir(), "truemode-claim-tests-"));
try {
  const claimBundle = await build({
    entryPoints: ["src/core/semantic/claimIntelligence.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "bundle",
  });
  const claimModulePath = join(tempDir, "claimIntelligence.mjs");
  await writeFile(claimModulePath, claimBundle.outputFiles[0].text, "utf8");
  const { compareClaims } = await import(pathToFileURL(claimModulePath).href);

  const truthBundle = await build({
    entryPoints: ["src/core/semantic/truthDecisionOrchestrator.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "bundle",
  });
  const truthModulePath = join(tempDir, "truthDecisionOrchestrator.mjs");
  await writeFile(truthModulePath, truthBundle.outputFiles[0].text, "utf8");
  const { decideTruthBatch } = await import(pathToFileURL(truthModulePath).href);

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

  // Generic predicate labels are normalized consistently (underscore and space forms).
  assert.notEqual(compareClaims(
    claim("c2", "entity-1", "research_finding", "rainfall increased", "rainfall increased in district north"),
    claim("d2", "entity-1", "research finding", "school attendance improved", "school attendance improved in district south")
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

  const stored = (id, predicate, object, normalizedText, validFrom = "2026-01-01T00:00:00.000Z", validTo = "2027-01-01T00:00:00.000Z") => ({
    id, subjectEntityId: "entity-1", predicate, object, normalizedText,
    status: "supported", confidence: 0.95,
    firstObservedAt: "2026-01-01T00:00:00.000Z",
    lastObservedAt: "2026-10-15T00:00:00.000Z",
    validFrom, validTo, evidenceIds: [], counterEvidenceIds: [],
  });

  // Overlapping validity windows alone must not dispute unrelated generic findings.
  const unrelatedTemporal = decideTruthBatch([
    stored("t1", "research_finding", "rainfall increased", "rainfall increased in district north"),
    stored("t2", "research_finding", "school attendance improved", "school attendance improved in district south"),
  ], [], [], [], "2026-10-15T00:00:00.000Z");
  assert.ok(unrelatedTemporal.every((decision) => decision.assessment.status !== "DISPUTED"));

  // Genuine opposing claims with overlapping validity windows must be marked disputed.
  const opposingTemporal = decideTruthBatch([
    stored("t3", "supports", "proposal alpha", "supports proposal alpha"),
    stored("t4", "opposes", "proposal alpha", "opposes proposal alpha"),
  ], [], [], [], "2026-10-15T00:00:00.000Z");
  assert.ok(opposingTemporal.every((decision) => decision.assessment.status === "DISPUTED"));

  console.log("TRUEMODE claim-comparison and temporal-dispute tests: PASS (8 cases)");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
