import assert from "node:assert/strict";
import { createFreshAutonomousLearningCore, FRESH_AI_TRAINING_CONSENT_VERSION } from "../src/core/fresh-ai/FreshAutonomousLearningCore.mjs";
const events = [];
const objectives = [];
const core = createFreshAutonomousLearningCore({
  eventStore: { async insert(row) { events.push(row); } },
  objectiveStore: {
    async insert(row) { objectives.push(row); },
    async listRunnable({ limit }) { return objectives.filter((row) => row.status === "queued").slice(0, limit); },
  },
  clock: () => new Date("2026-11-08T12:00:00.000Z"),
});
await assert.rejects(() => core.recordExperience({
  eventId: "event-no-consent", eventType: "conversation_observation", sourceType: "authorized_conversation",
  objective: "Learn a new word", confidence: 0.9, metadata: {},
}), /authorization/i);
await assert.rejects(() => core.recordExperience({
  eventId: "event-raw", eventType: "conversation_observation", sourceType: "authorized_conversation",
  objective: "Learn a new word", confidence: 0.9, metadata: { transcript: "private conversation" },
  authorization: { granted: true, scope: "learning-capture" },
}), /raw content/i);
const captured = await core.recordExperience({
  eventId: "event-safe", userId: "user-1", eventType: "speech_observation", sourceType: "authorized_speech",
  objective: "Identify a spoken Luganda word", confidence: 0.82,
  metadata: { language: "lug", modality: "audio", durationSeconds: 2.4 },
  authorization: { granted: true, scope: "learning-capture" },
});
assert.equal(captured.trainingEligible, false, "capture authorization must not imply training consent");
assert.equal(captured.rawContentStored, false);
assert.equal(captured.modelWeightsModified, false);
assert.equal(events.length, 1);
const candidate = await core.recordExperience({
  eventId: "event-reviewed", eventType: "user_correction", sourceType: "authorized_conversation",
  objective: "Correct a verified translation example", confidence: 1,
  metadata: { language: "lug", category: "translation" },
  authorization: { granted: true, scope: "learning-capture" },
  trainingConsent: FRESH_AI_TRAINING_CONSENT_VERSION,
  authorizationId: "consent-123", provenance: { verified: true, reference: "review-record-1" },
  reviewStatus: "approved",
});
assert.equal(candidate.trainingEligible, true);
const objective = await core.createObjective({
  objectiveId: "objective-1", title: "Practise vocabulary recognition",
  description: "Run a bounded exercise against approved vocabulary fixtures.",
  domain: "language", source: "autonomous", priority: 20,
});
assert.equal(objective.priority, 10);
assert.equal(objective.status, "queued");
assert.equal((await core.getRunnableObjectives({ limit: 5 })).length, 1);
await assert.rejects(() => core.getRunnableObjectives({ limit: 51 }), /limit/i);
console.log("FALC core checks passed: authorization, metadata-only capture, consent separation, review gating, and objective scheduling.");
