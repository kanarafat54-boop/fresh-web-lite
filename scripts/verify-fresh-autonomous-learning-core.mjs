import assert from "node:assert/strict";
import fs from "node:fs";
import {
  evaluateFreshLearningEligibility,
  orderFreshLearningObjectives,
  validateFreshLearningEvent,
  FRESH_LEARNING_CONSENT_VERSION,
} from "../src/core/fresh-ai/FreshAutonomousLearningCore.ts";
import {
  fromFreshLearningEventRow,
  toFreshLearningEventRow,
} from "../src/server/freshAILearningSupabase.ts";
import { runFreshLearningWorker } from "../src/server/freshAILearningWorker.ts";

const core = fs.readFileSync("src/core/fresh-ai/FreshAutonomousLearningCore.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261108230000_fresh_ai_autonomous_learning_core.sql", "utf8");
const docs = fs.readFileSync("docs/FRESH_AI_AUTONOMOUS_LEARNING_CORE.md", "utf8");
const adapter = fs.readFileSync("src/server/freshAILearningSupabase.ts", "utf8");
const workerMigration = fs.readFileSync("supabase/migrations/20261108234500_fresh_ai_learning_worker_leases.sql", "utf8");
const workerSource = fs.readFileSync("src/server/freshAILearningWorker.ts", "utf8");
const api = fs.readFileSync("src/server/freshAILearningEventsApi.ts", "utf8");
const routes = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

for (const token of [
  "FRESH_LEARNING_CONSENT_VERSION",
  "validateFreshLearningEvent",
  "evaluateFreshLearningEligibility",
  "FreshLearningEventRepository",
  "FreshLearningObjectiveRepository",
  "orderFreshLearningObjectives",
  "memoryOptIn",
  "trainingOptIn",
  "humanApproved",
  "privacyScreened",
  "mayEnterTrainingDataset",
]) assert.ok(core.includes(token), `FALC core contract missing ${token}`);

for (const token of [
  "fresh_ai_learning_events",
  "fresh_ai_learning_objectives",
  "ENABLE ROW LEVEL SECURITY",
  "FORCE ROW LEVEL SECURITY",
  "training_opt_in",
  "capture_allowed",
  "consent_version",
  "content_sha256",
  "payload_reference",
  "auth.uid() = user_id",
]) assert.ok(migration.includes(token), `FALC migration missing ${token}`);

assert.match(migration, /training_eligible\s+boolean\s+not null\s+default\s+false/i);
assert.match(migration, /training_eligible = false\s+or\s+\(/i);
assert.match(migration, /grant select, insert, delete/i);
assert.match(docs, /raw conversation|raw transcript/i);
assert.match(docs, /human review/i);
assert.match(docs, /does not (?:train|modify) model weights/i);
for (const token of ["createSupabaseFreshLearningEventRepository", "idempotency_key", "deleteById", "private/fresh-ai/", ".eq(\"user_id\", ownerId)"]) {
  assert.ok(adapter.includes(token), `Supabase learning adapter missing ${token}`);
}

assert.ok(api.includes("Never trust an owner id supplied by the client"));
assert.ok(api.includes("repository.append(event)"));
assert.ok(workerMigration.includes("FOR UPDATE SKIP LOCKED"));
assert.ok(workerMigration.includes("service_role_required"));
assert.ok(workerMigration.includes("lease_token"));
assert.ok(workerMigration.includes("attempts >= 5"));
assert.ok(workerSource.includes("fresh_ai_claim_learning_objectives"));
assert.ok(workerSource.includes("fresh_ai_complete_learning_objective"));
assert.ok(workerSource.includes("fresh_ai_fail_learning_objective"));
assert.ok(routes.routes.some((route) => route.src === "/api/ai/learning-events" && route.dest.includes("__fresh_learning_events=1")));

const now = new Date("2026-11-08T12:00:00.000Z");
const event = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  idempotencyKey: "123e4567-e89b-42d3-a456-426614174001",
  ownerId: "user-1",
  modality: "text",
  provenance: {
    source: "authorized-conversation",
    capturedAt: "2026-11-08T11:00:00.000Z",
    contentSha256: "a".repeat(64),
  },
  consent: {
    captureAllowed: true,
    memoryOptIn: true,
    trainingOptIn: true,
    consentVersion: FRESH_LEARNING_CONSENT_VERSION,
    grantedAt: "2026-11-08T10:00:00.000Z",
  },
  payloadReference: "private/fresh-ai/user-1/learning/123",
  summary: "Luganda vocabulary practice",
  createdAt: "2026-11-08T11:00:00.000Z",
  reviewStatus: "pending",
};

assert.deepEqual(validateFreshLearningEvent(event), { valid: true });
const persistedRow = toFreshLearningEventRow(event);
assert.equal(persistedRow.user_id, event.ownerId);
assert.equal(persistedRow.training_eligible, false);
assert.equal(persistedRow.review_status, "pending");
assert.deepEqual(fromFreshLearningEventRow(persistedRow), event);
assert.throws(() => toFreshLearningEventRow({ ...event, payloadReference: "private/fresh-ai/another-user/learning/123" }), /authenticated owner/);
assert.throws(() => toFreshLearningEventRow({ ...event, consent: { ...event.consent, revokedAt: "2026-11-08T11:30:00.000Z" } }), /expired, revoked/);
const pending = evaluateFreshLearningEligibility(event, {
  humanApproved: false,
  provenanceVerified: true,
  safetyChecked: true,
  privacyScreened: true,
}, now);
assert.equal(pending.retainInMemory, true);
assert.equal(pending.mayEnterTrainingReview, true);
assert.equal(pending.mayEnterTrainingDataset, false);

const approved = evaluateFreshLearningEligibility({ ...event, reviewStatus: "approved" }, {
  humanApproved: true,
  provenanceVerified: true,
  safetyChecked: true,
  privacyScreened: true,
}, now);
assert.equal(approved.mayEnterTrainingDataset, true);

const revoked = evaluateFreshLearningEligibility({
  ...event,
  reviewStatus: "approved",
  consent: { ...event.consent, revokedAt: "2026-11-08T11:30:00.000Z" },
}, {
  humanApproved: true,
  provenanceVerified: true,
  safetyChecked: true,
  privacyScreened: true,
}, now);
assert.equal(revoked.retainInMemory, false);
assert.equal(revoked.mayEnterTrainingReview, false);
assert.equal(revoked.mayEnterTrainingDataset, false);

assert.equal(validateFreshLearningEvent({
  ...event,
  payloadReference: "https://example.com/private-payload",
}).valid, false);

const ordered = orderFreshLearningObjectives([
  { id: "later", ownerId: "u", title: "Later", skill: "math", sourceEventIds: [], dueAt: "2026-11-10T00:00:00Z", status: "queued", attempts: 0 },
  { id: "earlier", ownerId: "u", title: "Earlier", skill: "language", sourceEventIds: [], dueAt: "2026-11-09T00:00:00Z", status: "queued", attempts: 0 },
  { id: "running", ownerId: "u", title: "Running", skill: "coding", sourceEventIds: [], dueAt: "2026-11-08T00:00:00Z", status: "running", attempts: 1 },
]);
assert.deepEqual(ordered.map((item) => item.id), ["earlier", "later"]);

const claimedObjective = {
  id: "objective-1",
  ownerId: "user-1",
  title: "Practise vocabulary",
  skill: "language",
  sourceEventIds: [],
  dueAt: now.toISOString(),
  status: "running",
  attempts: 1,
  leaseToken: "lease-1",
};
const workerCalls = [];
const workerResult = await runFreshLearningWorker({
  repository: {
    async claimDue() { return [claimedObjective]; },
    async complete(id, lease, reference) { workerCalls.push(["complete", id, lease, reference]); },
    async fail(id, lease, reason) { workerCalls.push(["fail", id, lease, reason]); },
  },
  processor: async () => ({ resultReference: "private/fresh-ai/user-1/practice/result-1" }),
  now,
  limit: 1,
});
assert.deepEqual(workerResult, { claimed: 1, completed: 1, failed: 0 });
assert.deepEqual(workerCalls, [["complete", "objective-1", "lease-1", "private/fresh-ai/user-1/practice/result-1"]]);

const failedWorkerResult = await runFreshLearningWorker({
  repository: {
    async claimDue() { return [claimedObjective]; },
    async complete() { throw new Error("should not complete"); },
    async fail(id, lease, reason) { workerCalls.push(["fail", id, lease, reason]); },
  },
  processor: async () => { throw new Error("engine unavailable"); },
  now,
  limit: 1,
});
assert.deepEqual(failedWorkerResult, { claimed: 1, completed: 0, failed: 1 });
assert.deepEqual(workerCalls.at(-1), ["fail", "objective-1", "lease-1", "processor_failed"]);

console.log("Fresh Autonomous Learning Core v1 contract, consent and persistence mapping: PASS");
