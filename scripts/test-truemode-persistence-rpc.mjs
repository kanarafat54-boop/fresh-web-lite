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

  const summary = { entities: 1, sources: 2, claims: 1, evidence: 2, claimEvidence: 1, relations: 0, arbitrations: 0, truthDecisions: 1 };
  const input = {
    batchKey: "research-batch-test-2026-10-15",
    entities: [{ id: "entity-1", entityType: "concept", label: "Test topic" }],
    sources: [{ id: "source-1", provider: "test", url: "https://example.test/source" }],
    claims: [], evidence: [], claimEvidence: [], relations: [], arbitrations: [], truthDecisions: [],
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
  await createSemanticPersistenceFromRpcClient(makeClient({ data: { persisted: true, alreadyPersisted: false, summary }, error: null })).persistResearchGraph(input);
  assert.equal(lastArgs.name, "persist_fresh_intelligence_research_graph");
  assert.equal(lastArgs.args.p_batch_key, input.batchKey);
  assert.equal(lastArgs.args.p_payload.entities[0].id, "entity-1");

  // 2: A duplicate retry is a successful idempotent outcome when the prior summary is present.
  await createSemanticPersistenceFromRpcClient(makeClient({ data: { persisted: false, alreadyPersisted: true, summary }, error: null })).persistResearchGraph(input);

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
  assert.doesNotThrow(() => assertResearchPersistenceRpcResult({ persisted: true, alreadyPersisted: false, summary }));
  assert.equal(calls, 8);
  console.log("TRUEMODE persistence RPC acknowledgement tests: PASS (8 cases)");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
