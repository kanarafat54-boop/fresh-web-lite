/**
 * Fresh Autonomous Learning Core (FALC) — guarded event and objective orchestration.
 * Stores learning metadata only. It rejects raw content, separates capture authorization
 * from training consent, and never trains or promotes model weights.
 */
const EVENT_TYPES = new Set(["conversation_observation","speech_observation","perception_observation","research_observation","user_correction","evaluation_failure","practice_result"]);
const SOURCE_TYPES = new Set(["authorized_conversation","authorized_speech","authorized_media","approved_research","evaluation","autonomous_practice"]);
const CONSENT_VERSION = "fresh-ai-feedback-consent-v1";
const RAW_CONTENT_KEYS = new Set(["content","transcript","message","prompt","answer","correction","audio","image","video","rawText"]);

function requiredText(value, field, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new TypeError(field + " must be a non-empty string of at most " + max + " characters");
  }
  return value.trim();
}
function assertMetadataOnly(value, path = "metadata") {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(path + " must be an object");
  for (const [key, child] of Object.entries(value)) {
    if (RAW_CONTENT_KEYS.has(key)) throw new TypeError(path + " must not contain raw content field: " + key);
    if (typeof child === "string" && child.length > 1000) throw new TypeError(path + " string values must not exceed 1000 characters");
    if (child && typeof child === "object") assertMetadataOnly(child, path + "." + key);
  }
  if (JSON.stringify(value).length > 8192) throw new RangeError(path + " exceeds 8 KiB");
}

export function createFreshAutonomousLearningCore({ eventStore, objectiveStore, clock = () => new Date() } = {}) {
  if (!eventStore || typeof eventStore.insert !== "function") throw new TypeError("eventStore.insert is required; no volatile-memory fallback is allowed");
  if (!objectiveStore || typeof objectiveStore.insert !== "function" || typeof objectiveStore.listRunnable !== "function") {
    throw new TypeError("objectiveStore.insert and objectiveStore.listRunnable are required");
  }
  return Object.freeze({
    async recordExperience(input) {
      if (!input || typeof input !== "object") throw new TypeError("experience is required");
      if (input.authorization?.granted !== true || input.authorization?.scope !== "learning-capture") {
        throw new Error("Explicit learning-capture authorization is required");
      }
      const eventType = requiredText(input.eventType, "eventType");
      const sourceType = requiredText(input.sourceType, "sourceType");
      if (!EVENT_TYPES.has(eventType)) throw new TypeError("Unsupported learning event type");
      if (!SOURCE_TYPES.has(sourceType)) throw new TypeError("Unsupported learning source type");
      if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
        throw new TypeError("confidence must be a number between 0 and 1");
      }
      const metadata = input.metadata ?? {};
      assertMetadataOnly(metadata);
      const trainingConsent = input.trainingConsent === CONSENT_VERSION;
      const provenanceVerified = input.provenance?.verified === true;
      const humanReviewed = input.reviewStatus === "approved";
      const trainingEligible = trainingConsent && provenanceVerified && humanReviewed &&
        typeof input.authorizationId === "string" && input.authorizationId.trim().length > 0;
      const event = {
        eventId: requiredText(input.eventId, "eventId", 128),
        userId: input.userId ?? null,
        eventType, sourceType,
        objective: requiredText(input.objective, "objective", 240),
        confidence: input.confidence, metadata,
        provenance: {
          reference: typeof input.provenance?.reference === "string" ? input.provenance.reference.slice(0, 500) : null,
          verified: provenanceVerified,
        },
        captureAuthorized: true,
        trainingOptIn: trainingConsent,
        consentVersion: trainingConsent ? CONSENT_VERSION : null,
        authorizationId: trainingEligible ? input.authorizationId.trim() : null,
        reviewStatus: humanReviewed ? "approved" : "pending",
        trainingEligible,
        createdAt: clock().toISOString(),
      };
      await eventStore.insert(event);
      return { ...event, rawContentStored: false, modelWeightsModified: false };
    },
    async createObjective(input) {
      if (!input || typeof input !== "object") throw new TypeError("objective is required");
      const objective = {
        objectiveId: requiredText(input.objectiveId, "objectiveId", 128),
        ownerId: input.ownerId ?? null,
        title: requiredText(input.title, "title", 160),
        description: requiredText(input.description, "description", 1000),
        domain: requiredText(input.domain, "domain", 80),
        source: input.source === "autonomous" ? "autonomous" : "user_requested",
        status: "queued",
        priority: Number.isInteger(input.priority) ? Math.max(0, Math.min(input.priority, 10)) : 5,
        maxAttempts: Number.isInteger(input.maxAttempts) ? Math.max(1, Math.min(input.maxAttempts, 5)) : 3,
        attempts: 0,
        createdAt: clock().toISOString(),
      };
      await objectiveStore.insert(objective);
      return objective;
    },
    async getRunnableObjectives({ limit = 10 } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new RangeError("limit must be between 1 and 50");
      return objectiveStore.listRunnable({ limit, statuses: ["queued", "blocked"] });
    },
  });
}
export const FRESH_AI_TRAINING_CONSENT_VERSION = CONSENT_VERSION;
