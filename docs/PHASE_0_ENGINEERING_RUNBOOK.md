# Phase 0 Engineering Runbook — Fresh ID, Messaging and Mail

**Updated:** 2026-10-14  
**Production baseline observed:** `main` at `acf9fe9018f100995240f1619b208626cf9e4acd`  
**Primary environment:** Fresh Web Lite on Vercel + Supabase  
**Status:** Active; security migrations are proposed in PR #56 and have not been applied to production.

## Operating rules

- Distinguish inspected, implemented, tested, deployed and production-verified states.
- Never treat RLS being enabled as a complete security review. Table/column grants and row policies must agree.
- Do not apply an uncertain migration directly to production. Review migration SQL, run CI and authorization tests, apply deliberately, then re-inspect live grants/policies.
- Do not purchase a domain or start a paid provider without explicit approval.
- Do not represent internal direct messages as external email.

## Verified baseline

### Fresh ID
- PR #51 (`feat/fresh-id-complete-signup`) remains a draft and is not merged. Its earlier signup implementation passed all five GitHub workflows and Vercel/Netlify previews; follow-up work now fixes the email-confirmation return button and replaces timezone-sensitive birth-date validation with a shared date-only validator plus regression tests. The latest follow-up pipeline is pending at this runbook refresh; this remains CI evidence, not a real email-confirmation signup test.
- Migration `20261014132351_fresh_id_signup_profile_fields` is recorded as applied in Supabase.
- `fresh_id_private_profiles` has owner-scoped SELECT/INSERT/UPDATE policies.
- Still required: a dedicated real signup journey including confirmation email, duplicate username, password mismatch, session restoration, and post-login/landing-page navigation. The confirmation screen previously returned to the form without switching out of registration mode; the follow-up corrects the mode and canonical URL.
- A date-of-birth bug was found in client-side validation: parsing a calendar date as local midnight and comparing its UTC ISO date can reject valid dates in UTC-positive time zones (including Uganda). The follow-up uses one UTC date-only validator in both the form and auth context and adds regression cases; wait for CI before treating the fix as verified.
- Supabase Auth advisor reports leaked-password protection disabled. This is an Auth dashboard setting and must be reviewed explicitly; it is not fixed by a database migration.

### Messaging and connection authorization
- Live tables `direct_messages`, `connection_requests`, `fresh_communication_threads`, and `fresh_communication_messages` exist.
- At inspection, Fresh Communication thread/message tables had zero rows.
- A second read-only verification after the proposed fixes were committed confirmed that production remains unchanged: 0 of the 3 Phase 0 security migrations are applied; 4 duplicate connection-request policies remain; 12 `anon` table grants remain across the three messaging tables; and 3 `anon` write grants remain on `ecosystem_profiles`. These are still open production findings—not fixed until a controlled migration is applied and re-verified.
- Broad `anon` grants existed on the messaging tables. RLS was enabled but did not revoke these SQL privileges.
- The live connection-request table had duplicate permissive SELECT/UPDATE policies. The update policies allowed either participant to change a row's status, which meant the requester could attempt to self-accept a request.
- Live `ecosystem_profiles` also had broad `anon` table privileges despite a policy intended to expose only enabled profiles publicly. The proposed migration keeps public SELECT for enabled profiles, removes anonymous writes and narrows signed-in operations; duplicate owner write policies are cleaned up.
- The current schema models Fresh Communication threads as owner-only; it does not yet have a participants/membership table. The proposed migration intentionally preserves that model instead of inventing group membership.
- PR #56 proposes least-privilege grants, separate owner-only message policies, recipient-only acceptance/decline, and tests. It is not production-applied.
- The no-cost isolated PostgreSQL harness now uses a production-aligned fixture for the inspected target tables (including `connection_requests.updated_at`, `fresh_communication_threads.updated_at`, `ecosystem_profiles.fresh_id`, relevant foreign keys/checks/indexes, and the legacy policies/grants that the migrations remove). It is still a focused fixture, not a full Supabase clone.

### Fresh Mail
- Existing direct messages and `fresh_communication_*` tables are internal messaging, not proof of an external email service.
- No working end-to-end external send/receive flow has been verified. No mail provider or custom sender domain is configured.
- First safe proof: use a provider's test/sandbox receiving address, one verified sender, a server-side send endpoint, webhook signature validation, durable inbound-message record, deduplication, and a mailbox UI that reports delivery failures honestly.
- A production branded mailbox requires a verified sender/receiving domain, DNS configuration and provider setup. The current Vercel app hostname does not automatically grant mail DNS control.
- Resend remains a candidate, not a selected/configured provider. Inbound capability reference: https://resend.com/features/inbound.

### Release and advisor state
- PR #56 head `3fba2d8a` passed all six GitHub Actions workflows, including Phase 0 isolated PostgreSQL run [#6](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/38634570217). The database job passed **34/34 pgTAP assertions** and **16 simulated-user behavior checks**, including cancellation/re-send, recipient-only read receipts, owner-only threads, and ecosystem-profile ownership. The build gate also passed typecheck, build and lint. Vercel preview deployment is currently blocked by the Free-plan daily deployment limit; this is not a build/test failure. These tests do not prove the migration against the complete production schema or real Supabase Auth.
- Live project health reports `ACTIVE_HEALTHY`; Supabase branch metadata separately reports the default `main` branch as `MIGRATIONS_FAILED`, while the actual migration ledger contains the expected recent applied migrations through `20261014132351`. Treat this as a metadata/status discrepancy to investigate, not proof that the new Phase 0 migrations were applied. They are absent from the live migration ledger and live grants/policies remain unchanged.
- Supabase security advisor reported 10 RLS-enabled tables with no policies and leaked-password protection disabled. These require table-by-table review; no blanket policy creation.
- Supabase performance advisor reported 89 RLS initialization-plan warnings and 19 multiple-permissive-policy findings. Fixes should be scoped, measured and regression-tested rather than applied as broad find/replace edits.

## PR #56 scope

Link: https://github.com/kanarafat54-boop/fresh-web-lite/pull/56

- Revoke broad browser-role grants from direct messages and Fresh Communication tables, then grant only required operations.
- Scope direct-message inserts to authenticated senders with an accepted connection.
- Restrict messages to the current owner-only thread model.
- Remove duplicate connection-request policies and prevent requesters from changing accepted connections.
- Make `sendConnectionRequest` idempotent for already pending/accepted relationships.
- Add a static migration-contract check and pgTAP catalog assertions.

**Test limitations:** static checks prove only that expected source contracts are present. The disposable PostgreSQL run verifies the migration against the production-aligned focused fixture and confirms catalog grants/policies plus simulated identity behavior. It does not use real Supabase Auth, does not reproduce every production object/dependency, and does not modify production. A controlled full-schema test or dedicated two-account Supabase test, Vercel preview/runtime verification, and post-apply grants/policies/advisor checks are still required before production safety can be claimed.

## Execution sequence

### Gate 0A — source and CI
- [x] Current PR #56 head has successful build, lint, and Phase 0 source-contract checks.
- [ ] SQL migration reviewed for every privilege/policy change.
- [x] pgTAP catalog test passes against a disposable PostgreSQL database with the migrations applied (34/34 assertions).
- [x] Simulated-identity behavior suite passes in the same disposable database (16 checks).
- [ ] Run a full-schema migration test and/or dedicated two-account test against a non-production Supabase environment.

### Gate 0B — authorization behavior
- [ ] Account A can read only its own direct messages.
- [ ] Account B cannot read A's messages unless B is a participant as sender/recipient.
- [ ] Non-connected users cannot create direct messages.
- [ ] A requester cannot accept their own connection request or change an accepted connection to pending.
- [ ] Only the recipient can accept/decline a pending request.
- [ ] Thread owner can create/read their thread and messages; another user cannot.
- [x] Simulated database checks cover send, receive/read visibility, recipient-only mark-read, request, cancel, accept, decline, and re-send.
- [ ] Verify those same paths with two real Supabase Auth test accounts and the deployed preview.

### Gate 0C — controlled application
- [ ] Confirm correct target environment and backup/rollback plan.
- [ ] Apply reviewed migration in the intended environment.
- [ ] Re-query grants and policies and rerun Supabase security advisors.
- [ ] Verify app runtime with two dedicated test accounts.
- [ ] Only then merge PR #56 and promote the verified commit.

### Gate 0D — Fresh ID
- [ ] Test signup with a dedicated test account.
- [ ] Confirm email redirects to the correct HTTPS route and establishes a session.
- [ ] Verify private profile persistence and no duplicate or leaked sensitive metadata.
- [ ] Verify session restoration, logout and protected routes.
- [ ] Fix landing-page navigation before calling auth journey complete.
- [ ] Review leaked-password protection availability/settings with the project's current plan.

### Gate 0E — Fresh Mail
- [ ] Select a provider after comparing free-tier limits, receiving support, pricing, retention, security and data location.
- [ ] Add server-side environment variables only after explicit configuration approval.
- [ ] Implement outbound send endpoint with authenticated identity, input validation, rate limits, idempotency and provider error handling.
- [ ] Implement inbound webhook with signature verification, deduplication, bounded attachment handling and malware/abuse controls.
- [ ] Store mail in mail-specific tables with owner-scoped RLS; do not reuse direct-message tables as mail storage.
- [ ] Test send → provider delivery → receive/webhook → inbox listing → open message → reply → failure/retry.
- [ ] Decide on a custom domain only after the sandbox journey works.

### Gate 0F — Fresh Flow and Fresh Live
- [ ] Inspect existing Fresh Flow runtime against `docs/FRESH_COMMUNICATION_AND_FLOW_COMPLETION_REGISTER.md`.
- [ ] Mark each capability as implemented, partial, blocked, deferred or not implemented based on code and tests.
- [ ] Start Fresh Live with a private host/viewer test only after auth, provider cost, safety and stream-health design are ready.
- [ ] Do not claim creator payouts, licensed music, commerce, or large-scale live broadcasting until their providers, legal requirements and runtime tests are complete.

## Definition of done for Phase 0

Phase 0 is complete only when the critical access-control findings are fixed and tested, Fresh ID's real confirmation/session/navigation journey works, production grants/policies have been re-verified, and the next-step Fresh Mail provider plan is costed and approved. Creating PRs or documents alone does not satisfy the gate.


### Follow-up from live runtime log review (2026-10-14)
- A separate draft PR #59 records and fixes three confirmed schema/runtime mismatches: profile suggestions selected nonexistent `users.avatar`; profile insight/count queries selected nonexistent `follows.id`; and `ensure_default_ecosystem_profiles()` attempted to save `fresh-picks` although the live check constraint rejected it.
- PR #59's build gate and isolated PostgreSQL constraint test passed on the tested commit. Its forward-only migration has **not** been applied to production.
- Supabase's default development branch still reports `MIGRATIONS_FAILED`, created 2026-07-18, while the production project reports `ACTIVE_HEALTHY` and the applied migration ledger is intact through `20261014132351`. The last-24-hour database logs did not expose the original branch-replay failure. Supabase's documented next step is to open **Branches → main → View logs** and identify the exact failed migration statement; do not repair/reset/rebase the branch or mark migrations applied until that error is known.
- Security advisor also reports 10 RLS-enabled tables without policies; a read-only grant check found browser-role grants absent and `service_role` grants present on all 10. These findings should be reviewed table-by-table rather than given blanket policies. Leaked-password protection remains disabled and needs a deliberate Auth setting review.
