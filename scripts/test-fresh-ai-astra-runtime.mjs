import assert from "node:assert/strict";
import { ingestAstraObservation, getAstraModalityReadiness } from "../src/core/fresh-ai/astra/AstraRuntime.ts";
import { evaluateAstraAction, validateAstraObservation } from "../src/core/fresh-ai/astra/AstraContracts.ts";

const now = "2026-10-30T12:00:00.000Z";
const base = {
  id: "obs-1",
  modality: "image",
  capturedAt: "2026-10-30T11:59:00.000Z",
  source: "user-upload",
  consentGranted: true,
  payloadRef: "uploads/user-1/image-1",
};

assert.deepEqual(validateAstraObservation(base, { now }), [], "valid consented image observation passes");
assert.ok(validateAstraObservation({ ...base, payloadRef: undefined }, { now }).some((x) => x.includes("stored payload reference")), "non-text observation requires stored payload reference");
assert.ok(validateAstraObservation({ ...base, capturedAt: "2026-10-30T12:06:00.000Z" }, { now }).some((x) => x.includes("future")), "future capture timestamp rejected");
assert.ok(validateAstraObservation({ ...base, confidence: Number.NaN }, { now }).some((x) => x.includes("finite number")), "NaN confidence rejected");
assert.ok(validateAstraObservation({ ...base, payloadRef: "https://evil.example/image.png" }, { now }).some((x) => x.includes("opaque storage reference")), "arbitrary URLs rejected as payload refs");
assert.ok(validateAstraObservation({ ...base, consentGranted: false }, { now }).some((x) => x.includes("consent")), "missing consent rejected");
assert.ok(validateAstraObservation({ ...base, source: "user-microphone" }, { now }).some((x) => x.includes("Microphone")), "source/modality mismatch rejected");

const accepted = ingestAstraObservation(base, { now });
assert.equal(accepted.accepted, true, "valid observation accepted into provenance envelope");
if (accepted.accepted) {
  assert.equal(accepted.inference, "unavailable", "no inference is claimed without a registered engine");
  assert.equal(accepted.worldState.observations.length, 1, "world state preserves the source observation");
  assert.equal(accepted.worldState.entities.length, 0, "no entities fabricated");
  assert.ok(accepted.worldState.uncertainty.length > 0, "unavailability and uncertainty are explicit");
}

const readiness = getAstraModalityReadiness();
assert.equal(readiness.length, 5);
assert.ok(readiness.every((item) => item.owner === "Fresh AI" && item.modelId === "fresh-unified-1" && item.state === "configuration-required"));

const proposal = {
  id: "action-1", action: "move", parameters: {}, risk: "low",
  expiresAt: "2026-10-30T12:05:00.000Z", idempotencyKey: "idem-1", requestedBy: "user-1",
};
const blockedPhysical = evaluateAstraAction(proposal, {
  environment: "physical", userAuthenticated: true, consentGranted: true,
  devicePaired: true, deviceCapabilityGranted: true, humanApproved: true,
  safetyInterlocksVerified: true, emergencyStopAvailable: true, now,
});
assert.equal(blockedPhysical.decision, "blocked", "physical actuation remains blocked");
assert.equal(blockedPhysical.executable, false, "policy never dispatches");
const critical = evaluateAstraAction({ ...proposal, risk: "critical" }, {
  environment: "simulation", userAuthenticated: true, consentGranted: true,
  devicePaired: true, deviceCapabilityGranted: true, humanApproved: true,
  safetyInterlocksVerified: true, emergencyStopAvailable: true, now,
});
assert.equal(critical.decision, "blocked", "critical risk remains blocked");

console.log("Astra runtime passed: consent, provenance, timestamp, payload, uncertainty, readiness and actuation safety.");
