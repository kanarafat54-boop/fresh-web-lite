import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = await mkdtemp(join(tmpdir(), "truemode-persistence-rpc-"));
try {
  const bundle = await build({
    entryPoints: ["src/core/semantic/supabaseSemanticPersistence.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    packages: "bundle",
  });
  const modulePath = join(tempDir, "supabaseSemanticPersistence.mjs");
  await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
  const { createSemanticPersistenceFromRpcClient, assertResearchPersistenceRpcResult } = await import(pathToFileURL(modulePath).href);

  const summary = { entities: 1, sources: 2, claims: 1, evidence: 2, claimEvidence: 1, claimPassages: 1, relations: 0, arbitrations: 0, truthDecisions: 1 };
  const input = {
    batchKey: "research-batch-test-2026-10-15",
    entities: [{ id: "entity-1", entityType: "concept", label: "Test topic" }],
    sources: [{ id: "source-1", provider: "test", url: "https://example.test/source" }],
    claims: [], evidence: [], claimEvidence: [], relations: [], arbitrations: [], truthDecisions: [],
    passports: [{ sourceId: "source-1", passport: { id: "FEP-TEST-001", version: "1.0", issuer: "Fresh Web Lite Research", issuedAt: "2026-11-18T20:00:00.000Z", source: { title: "Test source", url: "https://example.test/source", publisherDomain: "example.test", retrievalProvider: "test", observedAt: "2026-11-18T20:00:00.000Z" }, capturedMaterial: { kind: "title_only", text: "Test source", digestAlgorithm: "SHA-256", digest: "a".repeat(64) }, verification: { recordStatus: "recorded", sourceUrlStatus: "valid_http_url", publisherAuthenticity: "not_independently_verified", claimSupport: "requires_content_review" }, limitations: [] } }],
    claimPassages: [{ id: "passage-1", batchKey: "research-batch-test-2026-10-15", claimId: "claim-1", statementId: "s1", statementText: "A test statement.", statementStart: 0, statementEnd: 18, passportId: "FEP-TEST-001", sourceId: "source-1", evidenceId: "evidence-1", quote: "Test source", quoteStart: 0, quoteEnd: 11, method: "term-overlap-v1", matchScore: 0.9, matchedTerms: ["test", "source"], strength: "strong" }],
  };
  let calls = 0;
  let lastArgs;
  const makeClient = (reply) => ({
    rpc: async (name, args) => {
      calls += 1;
      lastArgs = { name, args };
      return typeof reply === "function" ? reply(name, args) : reply;
    },
  });

  // 1: A new atomic batch is accepted only with a complete positive acknowledgement.
  await createSemanticPersistenceFromRpcClient(makeClient({ data: { persisted: true, alreadyPersisted: false, summary, passportsPersisted: 1, claimPassagesPersisted: 1 }, error: null })).persistResearchGraph(input);
  assert.equal(lastArgs.name, "persist_fresh_intelligence_research_graph_with_passages");
  assert.equal(lastArgs.args.p_batch_key, input.batchKey);
  assert.equal(lastArgs.args.p_payload.entities[0].id, "entity-1");
  assert.equal(lastArgs.args.p_passports[0].passport_id, "FEP-TEST-001");
  assert.equal(lastArgs.args.p_passports[0].source_id, "source-1");
  assert.equal(lastArgs.args.p_claim_passages[0].quote_text, "Test source");
  assert.equal(lastArgs.args.p_claim_passages[0].quote_start, 0);
  assert.equal(lastArgs.args.p_claim_passages[0].passport_id, "FEP-TEST-001");

  // 2: A duplicate retry is a successful idempotent outcome when the prior summary is present.
  await createSemanticPersistenceFromRpcClient(makeClient({ data: { persisted: false, alreadyPersisted: true, summary, passportsPersisted: 0, claimPassagesPersisted: 0 }, error: null })).persistResearchGraph(input);

  // 3-6: Missing, ambiguous, or malformed acknowledgements must fail closed.
  for (const badResult of [
    null,
    { persisted: false, alreadyPersisted: false, summary },
    { persisted: true, alreadyPersisted: false },
    { persisted: true, alreadyPersisted: false, summary: { ...summary, claims: "one" } },
  ]) {
    await assert.rejects(
      createSemanticPersistenceFromRpcClient(makeClient({ data: badResult, error: null })).persistResearchGraph(input),
      /TRUEMODE persistence RPC/
    );
  }

  // 7: A database error is propagated to the caller, never converted into success.
  await assert.rejects(
    createSemanticPersistenceFromRpcClient(makeClient({ data: null, error: { message: "simulated database failure" } })).persistResearchGraph(input),
    /simulated database failure/
  );

  // 8: A transport rejection is propagated unchanged.
  await assert.rejects(
    createSemanticPersistenceFromRpcClient(makeClient(() => Promise.reject(new Error("simulated network failure")))).persistResearchGraph(input),
    /simulated network failure/
  );

  // Direct validation also guards the contract independently of the adapter.
  assert.doesNotThrow(() => assertResearchPersistenceRpcResult({ persisted: true, alreadyPersisted: false, summary, passportsPersisted: 1, claimPassagesPersisted: 1 }));
  assert.equal(calls, 8);
  console.log("TRUEMODE persistence RPC acknowledgement tests: PASS (8 cases)");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
