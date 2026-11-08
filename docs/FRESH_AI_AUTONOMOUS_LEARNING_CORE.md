# Fresh Autonomous Learning Core (FALC) v1

## Scope of this first implementation slice

FALC v1 establishes the shared learning-event contract, privacy boundary, durable event/objective schema, and deterministic objective ordering. It does not claim that a background learner, speech listener, trainer, or model-weight update is already running.

## Learning event lifecycle

1. A trusted client or server adapter receives a permitted input.
2. Capture permission and the versioned consent record are checked before creating an event.
3. The event stores a private payload reference, SHA-256 digest, minimized summary, modality, provenance, and owner scope. Raw conversation transcripts and media bytes do not belong in the event row.
4. Memory retention and training eligibility are evaluated independently.
5. Training candidates remain ineligible until explicit training opt-in, active consent, verified provenance, safety checks, privacy screening, and human approval all pass.
6. A service-side worker can create and claim learning objectives. Authenticated clients can read only their own objectives; they cannot create, claim, approve, or complete them.
7. Candidate training and model promotion remain separate offline, evaluated, approval-gated operations.

## Consent rules

- No implicit listening or ambient recording.
- No private conversation is retained for learning merely because it was processed to answer a request.
- Capture permission, durable-memory permission, and model-training permission are separate.
- Consent must be versioned and active; expiry and revocation block new eligibility.
- Revocation does not erase data already exported into unrelated artifacts automatically; retention/deletion must be handled by the owning data service.
- User deletion is supported for owned learning-event rows. The private payload store must implement corresponding object deletion.

## Persistence and scheduling contracts

- `src/server/freshAILearningSupabase.ts` implements the persistent event adapter against the existing Supabase service client. It maps the typed event contract to `fresh_ai_learning_events`, scopes reads and deletes by owner, validates private object-reference ownership, enforces active versioned consent, and checks duplicate idempotency keys against the original digest/reference/summary.
- `POST /api/ai/learning-events` and `GET /api/ai/learning-events?id=<uuid>` are routed through the existing feedback function to avoid adding another serverless function. The API authenticates the bearer token and overwrites any submitted owner id with the verified account id.
- Client submissions cannot set `training_eligible`; all rows persist with that flag false. Training-opted-in events enter only the pending human-review state.
- `FreshLearningEventRepository` requires owner-scoped reads and idempotent append on (ownerId, idempotencyKey).
- `FreshLearningObjectiveRepository` is a trusted worker interface. The SQL migration intentionally gives authenticated users read-only access to their own objectives and no write privileges.
- `orderFreshLearningObjectives` provides deterministic due-time ordering; it is not a scheduler or worker by itself.

## Training boundary

The schema defaults `training_eligible=false`. Client inserts cannot set it true. A trusted review/training service must independently verify consent, provenance, privacy screening, safety, human review, dataset authorization, and model-specific evaluation before preparing examples. FALC event ingestion does not modify model weights.

## Deployment requirements

1. Apply the migration in each Fresh Web Lite Supabase environment only after PR validation and explicit deployment approval.
2. Implement authenticated server adapters for event append/read and private payload lifecycle.
3. Implement a worker using service-role credentials stored only server-side; add bounded claims, retries, leases, dead-letter handling, and audit logs.
4. Add tests for RLS with two users, revocation, expiry, duplicate events, payload deletion, and worker-only objective transitions.
5. Connect the worker to the existing reviewed candidate preparer only after the above controls pass.
6. Run the repository's FALC contract test, TypeScript check, lint, build, and relevant Fresh AI tests on the exact PR head.

## Explicit non-goals

- No always-on microphone or passive collection.
- No training on ordinary private chats by default.
- No autonomous production checkpoint promotion.
- No claim that this migration alone makes Fresh AI continuously learn or improves its neural weights.
