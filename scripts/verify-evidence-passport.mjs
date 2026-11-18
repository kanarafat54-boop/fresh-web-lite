import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const read = (path) => fs.readFileSync(path, "utf8");
const passport = read("src/core/research/evidencePassport.ts");
const contract = read("src/core/research/contracts.ts");
const persistence = read("src/server/research/persistSemanticResearchV2.ts");
const researchApi = read("api/research/search.ts");
const connector = read("src/features/ai/intelligence/intelligenceConnectors.ts");
const resultsUi = read("src/features/home/components/FreshResearchResults.tsx");
const persistenceAdapter = read("src/core/semantic/supabaseSemanticPersistence.ts");
const passportMigration = read("supabase/migrations/20261118203000_fresh_intelligence_evidence_passports.sql");

assert.match(passport, /createHash\("sha256"\)/, "Passport must use SHA-256");
assert.match(passport, /FEP-/, "Passport must have a stable, inspectable ID");
assert.match(passport, /publisherAuthenticity: "not_independently_verified"/, "Passport must not claim publisher authenticity without verification");
assert.match(passport, /claimSupport: "requires_content_review"/, "A fingerprint must not be treated as proof of claim support");
assert.match(passport, /capturedMaterial/, "Passport must identify exactly what material was fingerprinted");
assert.match(passport, /not the complete original webpage/, "Passport must disclose its capture boundary");
assert.match(contract, /evidencePassport\?: EvidencePassport/, "Research source contract must carry its passport");
assert.match(persistence, /const passports = result\.sources\.flatMap/, "Research persistence must collect passport snapshots for the source graph");
assert.match(persistence, /truthDecisions, passports/, "Passports must enter the same persistence batch as the research graph");
assert.match(persistenceAdapter, /persist_fresh_intelligence_research_graph_with_passports/, "Supabase adapter must use the atomic graph-plus-passport RPC");
assert.match(persistenceAdapter, /input\.passports\.map/, "Supabase adapter must serialize every passport into the atomic write");
assert.match(passportMigration, /create table if not exists public\.fresh_intelligence_evidence_passports/, "Migration must create a dedicated passport ledger");
assert.match(passportMigration, /on conflict \(passport_id\) do nothing/, "Passport writes must be idempotent");
assert.match(passportMigration, /Fresh Evidence Passports are append-only records/, "Passport ledger must reject update and delete operations");
assert.match(researchApi, /createEvidencePassport\(source, researchedAt\)/, "Research API must issue a passport for every returned source");
assert.match(researchApi, /sources: researchResult\.sources/, "API must return the same passport-bearing source records it persists");
assert.ok(researchApi.includes("if (!researchSources.length)"), "Research API must fail closed when no source can receive a passport");
assert.ok(researchApi.includes("invalidSourceCount"), "Research API must disclose excluded invalid source records");
assert.match(connector, /evidencePassport\?: EvidencePassport/, "Frontend connector must preserve the passport contract");
assert.match(resultsUi, /source\.evidencePassport/, "Fresh Research UI must render passport records");
assert.match(resultsUi, /SHA-256 fingerprint/, "UI must expose the record fingerprint");
assert.match(resultsUi, /capturedMaterial\.text/, "UI must show the exact text covered by the fingerprint");
assert.match(resultsUi, /source\.observedAt/, "UI must show when Fresh captured the source");
assert.match(resultsUi, /Not independently verified/, "UI must disclose the publisher-authenticity limitation");

const tempDir = await mkdtemp(join(tmpdir(), "fresh-evidence-passport-"));
try {
  const bundle = await build({ entryPoints: ["src/core/research/evidencePassport.ts"], bundle: true, platform: "node", format: "esm", write: false });
  const modulePath = join(tempDir, "evidencePassport.mjs");
  await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
  const { createEvidencePassport } = await import(pathToFileURL(modulePath).href);
  const source = { title: "Example report", url: "https://www.example.test/report", snippet: "A captured report excerpt.", publishedAt: "2026-11-18T10:00:00.000Z", provider: "Test Search" };
  const observedAt = "2026-11-18T20:00:00.000Z";
  const first = createEvidencePassport(source, observedAt);
  const repeat = createEvidencePassport(source, observedAt);
  const later = createEvidencePassport(source, "2026-11-19T20:00:00.000Z");
  const changed = createEvidencePassport({ ...source, snippet: "A changed report excerpt." }, observedAt);
  assert.match(first.id, /^FEP-[A-F0-9]{32}$/);
  assert.equal(first.id, repeat.id, "Same source snapshot must produce the same passport identity");
  assert.equal(first.capturedMaterial.digest, repeat.capturedMaterial.digest);
  assert.notEqual(first.id, later.id, "A later observation must receive a distinct passport record");
  assert.equal(first.capturedMaterial.digest, later.capturedMaterial.digest, "Unchanged captured material must retain its fingerprint");
  assert.notEqual(first.capturedMaterial.digest, changed.capturedMaterial.digest, "Changed captured material must change its fingerprint");
  const expectedInput = JSON.stringify({ title: "Example report", url: "https://www.example.test/report", publisherDomain: "example.test", publishedAt: source.publishedAt, capturedText: source.snippet });
  assert.equal(first.capturedMaterial.digest, createHash("sha256").update(expectedInput, "utf8").digest("hex"));
  assert.throws(() => createEvidencePassport({ ...source, url: "javascript:alert(1)" }, observedAt), /valid public HTTP/);
  console.log("Fresh Evidence Passport runtime fingerprint tests: PASS (stable identity, new observation, tamper detection, unsafe URL rejection)");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("Fresh Evidence Passport contract and provenance persistence: PASS");
