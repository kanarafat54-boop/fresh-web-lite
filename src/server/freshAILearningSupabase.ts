import type { SupabaseClient } from "@supabase/supabase-js";
import {
  validateFreshLearningEvent,
  type FreshLearningEvent,
  type FreshLearningEventRepository,
} from "../core/fresh-ai/FreshAutonomousLearningCore.js";

type LearningEventRow = {
  id: string;
  user_id: string;
  idempotency_key: string;
  modality: FreshLearningEvent["modality"];
  source_kind: FreshLearningEvent["provenance"]["source"];
  payload_reference: string;
  content_sha256: string;
  summary: string;
  provenance: Record<string, unknown>;
  capture_allowed: boolean;
  memory_opt_in: boolean;
  training_opt_in: boolean;
  consent_version: string | null;
  consent_granted_at: string | null;
  consent_expires_at: string | null;
  consent_revoked_at: string | null;
  review_status: FreshLearningEvent["reviewStatus"];
  training_eligible: false;
  captured_at: string;
  created_at: string;
};

const PRIVATE_PAYLOAD_PREFIX = "private/fresh-ai/";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertPrivatePayloadOwnership(event: FreshLearningEvent): void {
  const expected = `${PRIVATE_PAYLOAD_PREFIX}${event.ownerId}/`;
  if (!event.payloadReference.startsWith(expected) || event.payloadReference.includes("..")) {
    throw new Error("Learning payload reference must be inside the authenticated owner's private Fresh AI namespace.");
  }
}

export function toFreshLearningEventRow(event: FreshLearningEvent): LearningEventRow {
  const validation = validateFreshLearningEvent(event);
  if (!validation.valid) throw new Error(validation.reason);
  assertPrivatePayloadOwnership(event);

  const granted = Date.parse(event.consent.grantedAt);
  const expires = event.consent.expiresAt ? Date.parse(event.consent.expiresAt) : Number.POSITIVE_INFINITY;
  const revoked = event.consent.revokedAt ? Date.parse(event.consent.revokedAt) : Number.POSITIVE_INFINITY;
  const now = Date.now();
  if (
    event.consent.consentVersion !== "fresh-autonomous-learning-v1" ||
    !Number.isFinite(granted) ||
    granted > now ||
    now >= expires ||
    now >= revoked
  ) {
    throw new Error("Learning event consent is expired, revoked, or not versioned and active.");
  }

  if (event.consent.trainingOptIn && event.reviewStatus !== "pending") {
    throw new Error("Training-opted-in events must enter the pending human-review queue.");
  }
  if (!event.consent.trainingOptIn && event.reviewStatus !== "not-eligible") {
    throw new Error("Events without training opt-in must remain outside the training-review queue.");
  }

  return {
    id: event.id,
    user_id: event.ownerId,
    idempotency_key: event.idempotencyKey,
    modality: event.modality,
    source_kind: event.provenance.source,
    payload_reference: event.payloadReference,
    content_sha256: event.provenance.contentSha256,
    summary: event.summary,
    provenance: {
      source: event.provenance.source,
      capturedAt: event.provenance.capturedAt,
      ...(event.provenance.sourceReference ? { sourceReference: event.provenance.sourceReference } : {}),
    },
    capture_allowed: event.consent.captureAllowed,
    memory_opt_in: event.consent.memoryOptIn,
    training_opt_in: event.consent.trainingOptIn,
    consent_version: event.consent.consentVersion,
    consent_granted_at: event.consent.grantedAt,
    consent_expires_at: event.consent.expiresAt ?? null,
    consent_revoked_at: event.consent.revokedAt ?? null,
    review_status: event.reviewStatus,
    training_eligible: false,
    captured_at: event.provenance.capturedAt,
    created_at: event.createdAt,
  };
}

export function fromFreshLearningEventRow(row: LearningEventRow): FreshLearningEvent {
  const provenance = row.provenance ?? {};
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    ownerId: row.user_id,
    modality: row.modality,
    provenance: {
      source: row.source_kind,
      capturedAt: row.captured_at,
      ...(typeof provenance.sourceReference === "string" ? { sourceReference: provenance.sourceReference } : {}),
      contentSha256: row.content_sha256,
    },
    consent: {
      captureAllowed: row.capture_allowed,
      memoryOptIn: row.memory_opt_in,
      trainingOptIn: row.training_opt_in,
      consentVersion: row.consent_version ?? "",
      grantedAt: row.consent_granted_at ?? "",
      ...(row.consent_expires_at ? { expiresAt: row.consent_expires_at } : {}),
      ...(row.consent_revoked_at ? { revokedAt: row.consent_revoked_at } : {}),
    },
    payloadReference: row.payload_reference,
    summary: row.summary,
    createdAt: row.created_at,
    reviewStatus: row.review_status,
  };
}

/**
 * Service-role adapter. Construct only inside trusted server code; never pass
 * this client or its credentials to browser bundles. Every read/write includes
 * owner scope, and duplicate submissions are resolved by the DB unique key.
 */
export function createSupabaseFreshLearningEventRepository(
  client: SupabaseClient,
): FreshLearningEventRepository & { deleteById(ownerId: string, eventId: string): Promise<boolean> } {
  return {
    async append(event) {
      const row = toFreshLearningEventRow(event);
      const inserted = await client.from("fresh_ai_learning_events").insert(row).select("id").maybeSingle();
      if (!inserted.error && inserted.data?.id) return "inserted";
      if (inserted.error?.code !== "23505") {
        throw new Error(`Unable to persist Fresh AI learning event (${inserted.error?.code ?? "unknown"}).`);
      }
      const existing = await client.from("fresh_ai_learning_events")
        .select("id")
        .eq("user_id", event.ownerId)
        .eq("idempotency_key", event.idempotencyKey)
        .maybeSingle();
      if (existing.error || !existing.data?.id) {
        throw new Error("Learning event idempotency conflict could not be verified.");
      }
      return "duplicate";
    },

    async getById(ownerId, eventId) {
      if (!ownerId.trim() || !UUID.test(eventId)) return null;
      const result = await client.from("fresh_ai_learning_events")
        .select("id,user_id,idempotency_key,modality,source_kind,payload_reference,content_sha256,summary,provenance,capture_allowed,memory_opt_in,training_opt_in,consent_version,consent_granted_at,consent_expires_at,consent_revoked_at,review_status,training_eligible,captured_at,created_at")
        .eq("user_id", ownerId)
        .eq("id", eventId)
        .maybeSingle();
      if (result.error) throw new Error("Unable to read Fresh AI learning event.");
      return result.data ? fromFreshLearningEventRow(result.data as LearningEventRow) : null;
    },

    async deleteById(ownerId, eventId) {
      if (!ownerId.trim() || !UUID.test(eventId)) return false;
      const result = await client.from("fresh_ai_learning_events")
        .delete()
        .eq("user_id", ownerId)
        .eq("id", eventId)
        .select("id");
      if (result.error) throw new Error("Unable to delete Fresh AI learning event.");
      return Array.isArray(result.data) && result.data.length > 0;
    },
  };
}
