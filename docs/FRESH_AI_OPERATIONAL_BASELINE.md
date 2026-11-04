# Fresh AI operational baseline

## Purpose

Fresh AI must be one coherent, on-demand workspace—not several competing AI screens and not a modal that follows users after they move to another workspace. The canonical product entry is `/ai`, rendered by `FreshAIUnified`. Contextual access outside `/ai` is optional and dismissible.

## Verified from repository source

- `/api/ai/ask` is the canonical request boundary described by the runtime roadmap.
- `FreshAIUnified` contains conversation, evidence, attachment, voice/read-aloud, capability gating, approval UI, and vault controls.
- The `/ai` route is registered to the unified surface.
- The capability registry distinguishes `implemented`, `contracted`, and `training-required`; unfinished capabilities must not be advertised as executable.
- The current model contract says `fresh-unified-1` has `weightsStatus: training-required`.
- A starter CPU training run is recorded in `training/STARTER_RUN1.md`, but it used 46 synthetic examples, 40 steps, and a reduced h128/two-layer model. The recorded loss is about 107.75 and the run explicitly is not production-ready.

These are source-level findings, not proof that every route/API works in production. Production and device verification remain outstanding until they are actually run.

## Work started in this change

1. Make the unified Fresh AI component close its contextual overlay when the active workspace changes; do not let it stay over unrelated work.
2. Keep the dedicated `/ai` route as the full workspace and keep the contextual launcher separate from the full-page experience.
3. Update the production-routing and unified-contract checks so they test the canonical unified UI and on-demand behavior rather than the older `FreshAIHome` implementation.

## Readiness ledger

| Area | Current status | Required next evidence |
|---|---|---|
| Canonical UI / routing | In progress | Build + route smoke test on preview; confirm only one canonical route |
| Contextual entry | In progress | Verify open, close, Escape, backdrop dismissal, and auto-close on route change |
| Conversation runtime | Partially wired in source | Authenticated and guest request tests against `/api/ai/ask`; error/retry/persistence tests |
| Search / Research | Contracted in roadmap; source integration exists | Real source retrieval, citations, failure cases, and repeatable tests |
| Files / Vision / Camera | Incomplete | Upload authorization, supported file types, context passing, and end-to-end tests |
| Create / image / 3D / media | Partial / engine-dependent | Confirm actual engines and output persistence; no placeholder result claims |
| Build / Code | Not ready for executable promise | Safe execution boundary, sandbox, tests, artifact output, and verification |
| Work / Actions / Automations | Not ready for unrestricted execution | Explicit permissions, approvals, audit events, rollback, and verified outcomes |
| Memory / Knowledge | Partial | User controls, provenance, retrieval quality, deletion/export, and security tests |
| Fresh-trained model weights | **Training required** | Authorized non-synthetic corpus, full-capacity training compute, held-out evaluations, safety review, registered checkpoint, and inference smoke tests |
| Production readiness | Not established | Passing CI, preview smoke tests, production URL/SHA verification, and mobile-device checks |

## Execution order

### Gate 1 — One reliable operating surface
- Canonical `/ai` route and single shared conversation service.
- Contextual entry opens only when asked for, can be dismissed, and closes when the user changes workspace.
- No dead buttons: disabled capability controls explain their actual readiness.
- Verify back-to-home, mobile layout, focus/keyboard behavior, errors, retry, and route reload.

### Gate 2 — End-to-end runtime
- Test `/api/ai/ask` for signed-in and guest flows, rate limits, provider/config absence, aborts, and server errors.
- Confirm conversation persistence and vault claims match what is actually encrypted. Live inference currently receives plaintext; do not describe the request path as end-to-end encrypted.
- Confirm research evidence and generated artifacts are persisted and can be reopened.

### Gate 3 — Capability completion
For each capability, require implementation, permissions, verification, observability, tests, and truthful degraded behavior before marking it implemented. Do not unlock UI controls just because a contract or engine name exists.

### Gate 4 — Training and model promotion
- Expand the authorized dataset with quality-controlled, licensed examples and documented provenance; synthetic starter data is not sufficient.
- Train at intended capacity on suitable compute and record dataset/checkpoint hashes, configuration, metrics, and reproducible run metadata.
- Evaluate held-out instruction following, reasoning, coding, factuality, safety, privacy, regressions, and latency.
- Register the checkpoint and verify that the production inference path loads that exact artifact.
- Only then change `weightsStatus` from `training-required`; never infer training success from a passing static contract test.

## Acceptance rule

A stage is complete only after its tests have run and evidence is recorded. A source file, route registration, mock, or passing static contract alone is not proof of a production-ready AI capability.
