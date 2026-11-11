# Fresh Autonomous Learning Core (FALC) — Milestone 1

## Delivered foundation

- Metadata-only learning event contract.
- Separate learning-capture authorization and explicit model-training consent.
- Provenance and human-review gates for training eligibility.
- Bounded learning objective records and runnable-objective adapter contract.
- Supabase persistence schema with owner-scoped RLS.
- Deterministic Node test for authorization, content exclusion, consent separation and scheduling bounds.

## Security and privacy invariants

1. No raw transcript, prompt, answer, correction, audio, image or video content is accepted in event metadata.
2. Learning capture authorization does not imply training consent.
3. Training eligibility requires versioned explicit training opt-in, an authorization identifier, verified provenance and approved human review.
4. The user-facing database role cannot mark events training-eligible or approve review status.
5. The objective queue is not unrestricted agent execution permission. A trusted server-side scheduler and service-role adapter must enforce budgets, allowed tools, timeouts and owner boundaries.
6. This milestone does not train, modify, register or promote model weights.

## Adapter contract

createFreshAutonomousLearningCore requires injected eventStore and objectiveStore adapters. It deliberately refuses an implicit in-memory fallback. Production integration must bind these adapters to the authenticated Supabase server client, validate user identity from the access token, and use a separate privileged worker for autonomous system-owned jobs.

## Verification

Run: node scripts/test-falc-core.mjs

The test is deterministic and local. Database migration application, deployed API integration, scheduler execution and native model training are separate verification gates.
