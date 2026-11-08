import assert from "node:assert/strict";
import fs from "node:fs";

const core = fs.readFileSync("src/core/fresh-ai/FreshAutonomousLearningCore.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261108230000_fresh_ai_autonomous_learning_core.sql", "utf8");
const docs = fs.readFileSync("docs/FRESH_AI_AUTONOMOUS_LEARNING_CORE.md", "utf8");

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
assert.match(migration, /grant select, insert, delete/i);
assert.match(docs, /raw conversation|raw transcript/i);
assert.match(docs, /human review/i);
assert.match(docs, /does not train model weights/i);
console.log("Fresh Autonomous Learning Core v1 contract: PASS");
