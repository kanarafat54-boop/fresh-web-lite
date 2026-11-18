import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const passport = read("src/core/research/evidencePassport.ts");
const contract = read("src/core/research/contracts.ts");
const persistence = read("src/server/research/persistSemanticResearchV2.ts");
const researchApi = read("api/research/search.ts");
const connector = read("src/features/ai/intelligence/intelligenceConnectors.ts");
const resultsUi = read("src/features/home/components/FreshResearchResults.tsx");
const persistenceAdapter = read("src/core/semantic/supabaseSemanticPersistence.ts");
const persistenceBridge = read("src/server/research/persistSemanticResearchV2.ts");
const passportMigration = read("supabase/migrations/20261118203000_fresh_intelligence_evidence_passports.sql");

assert.match(passport, /createHash\("sha256"\)/, "Passport must use SHA-256");
assert.match(passport, /FEP-/, "Passport must have a stable, inspectable ID");
assert.match(passport, /publisherAuthenticity: "not_independently_verified"/, "Passport must not claim publisher authenticity without verification");
assert.match(passport, /claimSupport: "requires_content_review"/, "A fingerprint must not be treated as proof of claim support");
assert.match(passport, /capturedMaterial/, "Passport must identify exactly what material was fingerprinted");
assert.match(passport, /not the complete original webpage/, "Passport must disclose its capture boundary");
assert.match(contract, /evidencePassport\?: EvidencePassport/, "Research source contract must carry its passport");
assert.match(persistence, /evidencePassport: source\.evidencePassport \?\? null/, "Passport must be persisted with source provenance metadata");
assert.match(researchApi, /createEvidencePassport\(source, researchedAt\)/, "Research API must issue a passport for every returned source");
assert.match(researchApi, /sources: researchResult\.sources/, "API must return the same passport-bearing source records it persists");
assert.ok(researchApi.includes("if (!researchSources.length)"), "Research API must fail closed when no source can receive a passport");
assert.ok(researchApi.includes("invalidSourceCount"), "Research API must disclose excluded invalid source records");
assert.match(connector, /evidencePassport\?: EvidencePassport/, "Frontend connector must preserve the passport contract");
assert.match(resultsUi, /source\.evidencePassport/, "Fresh Research UI must render passport records");
assert.match(resultsUi, /SHA-256 fingerprint/, "UI must expose the record fingerprint");
assert.match(resultsUi, /Not independently verified/, "UI must disclose the publisher-authenticity limitation");

console.log("Fresh Evidence Passport contract and provenance persistence: PASS");
