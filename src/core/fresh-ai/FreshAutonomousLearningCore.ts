/**
 * Fresh Autonomous Learning Core (FALC) — v1 contracts.
 *
 * This module defines the trust boundary for learning events. It deliberately
 * stores references and hashes rather than raw conversation/media payloads.
 * Persistence and background execution are supplied by server-side adapters.
 */

export const FRESH_LEARNING_CONSENT_VERSION = "fresh-autonomous-learning-v1";

export type FreshLearningModality =
  | "text"
  | "speech"
  | "image"
  | "video"
  | "document"
  | "demonstration"
  | "evaluation"
  | "synthetic-practice";

export type FreshLearningSource =
  | "authorized-conversation"
  | "authorized-speech"
  | "authorized-upload"
  | "user-correction"
  | "approved-research"
  | "self-practice"
  | "evaluation-result";

export type FreshLearningReviewStatus =
  | "not-eligible"
  | "pending"
  | "approved"
  | "rejected";

export type FreshLearningConsent = {
  captureAllowed: boolean;
  memoryOptIn: boolean;
  trainingOptIn: boolean;
  consentVersion: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
};

export type FreshLearningProvenance = {
  source: FreshLearningSource;
  capturedAt: string;
  sourceReference?: string;
  contentSha256: string;
};

export type FreshLearningEvent = {
  id: string;
  idempotencyKey: string;
  ownerId: string;
  modality: FreshLearningModality;
  provenance: FreshLearningProvenance;
  consent: FreshLearningConsent;
  /** Private object-storage reference; never a public URL or inline transcript. */
  payloadReference: string;
  /** Short, minimized task label. Do not put raw chat transcripts or secrets here. */
  summary: string;
  createdAt: string;
  reviewStatus: FreshLearningReviewStatus;
};

export type FreshLearningEligibility = {
  retainInMemory: boolean;
  mayEnterTrainingReview: boolean;
  mayEnterTrainingDataset: boolean;
  reasons: string[];
};

export type FreshLearningReview = {
  humanApproved: boolean;
  provenanceVerified: boolean;
  safetyChecked: boolean;
  privacyScreened: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
const MAX_SUMMARY_LENGTH = 240;
const MAX_REFERENCE_LENGTH = 512;

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function validateFreshLearningEvent(
  value: FreshLearningEvent,
): { valid: true } | { valid: false; reason: string } {
  if (!value || typeof value !== "object") return { valid: false, reason: "A learning event object is required." };
  if (!value.provenance || typeof value.provenance !== "object" || !value.consent || typeof value.consent !== "object") {
    return { valid: false, reason: "Learning provenance and consent records are required." };
  }
  if (typeof value.id !== "string" || typeof value.idempotencyKey !== "string" || typeof value.ownerId !== "string") {
    return { valid: false, reason: "Learning event identifiers and owner must be strings." };
  }
  if (typeof value.payloadReference !== "string" || typeof value.summary !== "string" || typeof value.createdAt !== "string") {
    return { valid: false, reason: "Learning payload reference, summary, and timestamp must be strings." };
  }
  if (typeof value.provenance.contentSha256 !== "string" || typeof value.provenance.capturedAt !== "string" || typeof value.provenance.source !== "string") {
    return { valid: false, reason: "Learning provenance fields are incomplete." };
  }
  if (typeof value.consent.captureAllowed !== "boolean" || typeof value.consent.memoryOptIn !== "boolean" || typeof value.consent.trainingOptIn !== "boolean" || typeof value.consent.consentVersion !== "string" || typeof value.consent.grantedAt !== "string") {
    return { valid: false, reason: "Learning consent fields are incomplete." };
  }
  if (!["text", "speech", "image", "video", "document", "demonstration", "evaluation", "synthetic-practice"].includes(value.modality)) {
    return { valid: false, reason: "Unsupported learning modality." };
  }
  if (!["authorized-conversation", "authorized-speech", "authorized-upload", "user-correction", "approved-research", "self-practice", "evaluation-result"].includes(value.provenance.source)) {
    return { valid: false, reason: "Unsupported learning provenance source." };
  }
  if (!["not-eligible", "pending", "approved", "rejected"].includes(value.reviewStatus)) {
    return { valid: false, reason: "Unsupported learning review status." };
  }
  if (!UUID.test(value.id) || !UUID.test(value.idempotencyKey)) {
    return { valid: false, reason: "Learning event identifiers must be UUIDs." };
  }
  if (!value.ownerId.trim()) return { valid: false, reason: "An authenticated owner is required." };
  if (!SHA256.test(value.provenance.contentSha256)) {
    return { valid: false, reason: "A SHA-256 payload digest is required." };
  }
  if (!value.payloadReference.trim() || value.payloadReference.length > MAX_REFERENCE_LENGTH) {
    return { valid: false, reason: "A bounded private payload reference is required." };
  }
  if (/^https?:\/\//i.test(value.payloadReference)) {
    return { valid: false, reason: "Public payload URLs are not accepted." };
  }
  if (!value.summary.trim() || value.summary.length > MAX_SUMMARY_LENGTH) {
    return { valid: false, reason: "A minimized summary of at most 240 characters is required." };
  }
  if (!isValidDate(value.createdAt) || !isValidDate(value.provenance.capturedAt) || !isValidDate(value.consent.grantedAt)) {
    return { valid: false, reason: "Event, capture, and consent timestamps must be valid." };
  }
  if (value.consent.expiresAt && !isValidDate(value.consent.expiresAt)) {
    return { valid: false, reason: "Consent expiry must be a valid timestamp." };
  }
  if (value.consent.revokedAt && !isValidDate(value.consent.revokedAt)) {
    return { valid: false, reason: "Consent revocation must be a valid timestamp." };
  }
  if (!value.consent.captureAllowed) {
    return { valid: false, reason: "Capture permission is required before ingesting an event." };
  }
  return { valid: true };
}

/**
 * Memory retention and model-training eligibility are intentionally separate.
 * Training always requires explicit versioned opt-in plus independent review.
 */
export function evaluateFreshLearningEligibility(
  event: FreshLearningEvent,
  review: FreshLearningReview,
  now = new Date(),
): FreshLearningEligibility {
  const reasons: string[] = [];
  const grantedAt = Date.parse(event.consent.grantedAt);
  const expiresAt = event.consent.expiresAt ? Date.parse(event.consent.expiresAt) : Number.POSITIVE_INFINITY;
  const revokedAt = event.consent.revokedAt ? Date.parse(event.consent.revokedAt) : Number.POSITIVE_INFINITY;
  const consentActive =
    Number.isFinite(grantedAt) &&
    grantedAt <= now.getTime() &&
    now.getTime() < expiresAt &&
    now.getTime() < revokedAt;
  const versionValid = event.consent.consentVersion === FRESH_LEARNING_CONSENT_VERSION;
  const retainInMemory = event.consent.captureAllowed && event.consent.memoryOptIn && consentActive && versionValid;

  if (!event.consent.captureAllowed) reasons.push("capture-not-authorized");
  if (!event.consent.memoryOptIn) reasons.push("memory-opt-in-missing");
  if (!event.consent.trainingOptIn) reasons.push("training-opt-in-missing");
  if (!consentActive) reasons.push("consent-inactive-or-revoked");
  if (!versionValid) reasons.push("consent-version-mismatch");
  if (!review.provenanceVerified) reasons.push("provenance-not-verified");
  if (!review.safetyChecked) reasons.push("safety-check-pending");
  if (!review.privacyScreened) reasons.push("privacy-screening-pending");
  if (!review.humanApproved) reasons.push("human-review-pending");

  const hasTrainingConsent =
    event.consent.captureAllowed &&
    event.consent.trainingOptIn &&
    consentActive &&
    versionValid;
  const mayEnterTrainingReview = hasTrainingConsent && event.reviewStatus === "pending";
  const mayEnterTrainingDataset =
    hasTrainingConsent &&
    event.reviewStatus === "approved" &&
    review.provenanceVerified &&
    review.safetyChecked &&
    review.privacyScreened &&
    review.humanApproved;

  if (event.reviewStatus === "rejected") reasons.push("training-review-rejected");
  if (event.reviewStatus !== "approved") reasons.push("training-review-not-approved");

  return { retainInMemory, mayEnterTrainingReview, mayEnterTrainingDataset, reasons };
}

export type FreshLearningObjective = {
  id: string;
  ownerId: string;
  title: string;
  skill: string;
  sourceEventIds: string[];
  dueAt: string;
  status: "queued" | "running" | "evaluating" | "completed" | "blocked" | "failed";
  attempts: number;
};

export interface FreshLearningEventRepository {
  /** Must enforce owner scope and idempotency on (ownerId, idempotencyKey). */
  append(event: FreshLearningEvent): Promise<"inserted" | "duplicate">;
  getById(ownerId: string, eventId: string): Promise<FreshLearningEvent | null>;
}

export interface FreshLearningObjectiveRepository {
  /** Worker-only adapter: never expose autonomous task creation to anonymous clients. */
  claimDue(now: string, limit: number): Promise<FreshLearningObjective[]>;
  complete(objectiveId: string, resultReference: string): Promise<void>;
  fail(objectiveId: string, reasonCode: string): Promise<void>;
}

/** Pure deterministic scheduler ordering; execution remains in a bounded worker. */
export function orderFreshLearningObjectives(
  objectives: readonly FreshLearningObjective[],
): FreshLearningObjective[] {
  return objectives
    .filter((item) => item.status === "queued" && Number.isFinite(Date.parse(item.dueAt)))
    .slice()
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.id.localeCompare(b.id));
}
