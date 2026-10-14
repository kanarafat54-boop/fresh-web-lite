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
- PR #51 (`feat/fresh-id-complete-signup`) remains a draft and is not merged.
- Migration `20261014132351_fresh_id_signup_profile_fields` is recorded as applied in Supabase.
- `fresh_id_private_profiles` has owner-scoped SELECT/INSERT/UPDATE policies.
- Still required: a dedicated real signup journey including confirmation email, duplicate username, password mismatch, session restoration, and post-login/landing-page navigation.
- Supabase Auth advisor reports leaked-password protection disabled. This is an Auth dashboard setting and must be reviewed explicitly; it is not fixed by a database migration.

### Messaging and connection authorization
- Live tables `direct_messages`, `connection_requests`, `fresh_communication_threads`, and `fresh_communication_messages` exist.
- At inspection, Fresh Communication thread/message tables had zero rows.
- Broad `anon` grants existed on the messaging tables. RLS was enabled but did not revoke these SQL privileges.
- The live connection-request table had duplicate permissive SELECT/UPDATE policies. The update policies allowed either participant to change a row's status, which meant the requester could attempt to self-accept a request.
- Live `ecosystem_profiles` also had broad `anon` table privileges despite a policy intended to expose only enabled profiles publicly. The proposed migration keeps public SELECT for enabled profiles, removes anonymous writes and narrows signed-in operations; duplicate owner write policies are cleaned up.
- The current schema models Fresh Communication threads as owner-only; it does not yet have a participants/membership table. The proposed migration intentionally preserves that model instead of inventing group membership.
- PR #56 proposes least-privilege grants, separate owner-only message policies, recipient-only acceptance/decline, and tests. It is not production-applied.

### Fresh Mail
- Existing direct messages and `fresh_communication_*` tables are internal messaging, not proof of an external email service.
- No working end-to-end external send/receive flow has been verified. No mail provider or custom sender domain is configured.
- First safe proof: use a provider's test/sandbox receiving address, one verified sender, a server-side send endpoint, webhook signature validation, durable inbound-message record, deduplication, and a mailbox UI that reports delivery failures honestly.
- A production branded mailbox requires a verified sender/receiving domain, DNS configuration and provider setup. The current Vercel app hostname does not automatically grant mail DNS control.
- Resend remains a candidate, not a selected/configured provider. Inbound capability reference: https://resend.com/features/inbound.

### Release and advisor state
- PR #56 latest recorded head `e64f3e8d`: Fresh Web Lite build gate, Fresh AI integrity, Fresh Shorts Production Gate, TRUEMODE Chain Verification and Fresh AI training contracts all passed; Vercel and Netlify previews report success, and Vercel deployment is READY. This verifies source/build contracts only—not live DB migration behavior.
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

**Test limitations:** static checks prove only that expected source contracts are present. pgTAP catalog assertions verify database grants/policies after applying migrations. Two-account behavioral tests are still required to verify actual allowed/denied access paths. The proposed migration must not be marked production-safe until those tests pass.

## Execution sequence

### Gate 0A — source and CI
- [ ] Latest PR #56 commit has successful build, lint, and contract checks.
- [ ] SQL migration reviewed for every privilege/policy change.
- [ ] pgTAP catalog test passes against a disposable/staging database with the migrations applied.

### Gate 0B — authorization behavior
- [ ] Account A can read only its own direct messages.
- [ ] Account B cannot read A's messages unless B is a participant as sender/recipient.
- [ ] Non-connected users cannot create direct messages.
- [ ] A requester cannot accept their own connection request or change an accepted connection to pending.
- [ ] Only the recipient can accept/decline a pending request.
- [ ] Thread owner can create/read their thread and messages; another user cannot.
- [ ] App flows still work for send, receive, mark-read, request, cancel, accept and decline.

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
