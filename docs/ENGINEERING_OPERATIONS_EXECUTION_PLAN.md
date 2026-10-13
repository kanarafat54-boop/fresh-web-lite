# Fresh Web Lite — Engineering Operations Execution Plan

**Date:** 2026-10-13  
**Purpose:** expand delivery from feature-by-feature fixes into a coordinated engineering operations programme. This is a working control document, not a claim that listed controls already exist.

## Operating rules

1. **Evidence over labels.** A component, migration, API, or green CI run is evidence of implementation, not proof of a complete production journey.
2. **No simulated success.** Never show a successful publish, message delivery, payment, payout, or live broadcast unless the real service confirms it.
3. **Server-side trust.** Identity, roles, ownership, money movement, private media, and private realtime access must be checked on the server/database boundary.
4. **Recoverability is part of done.** Critical paths need visible loading, empty, offline, failure, retry, and duplicate-submit behavior.
5. **Mobile is a production target.** Verify narrow screens, keyboard/reader access, weak networks, and low-memory Android behavior.
6. **Deploy evidence is commit-specific.** Record commit SHA, CI gates, deployment state, smoke tests, and rollback target together.
7. **Never expose secrets.** Operational dashboards show safe status and correlation IDs, not tokens, credentials, private payloads, or internal implementation details.

## Workstream A — Release engineering and change control

- [ ] Record current main SHA and compare it to the production deployment SHA.
- [ ] Require build, typecheck, lint, architecture/runtime contracts, security contracts, and feature-specific gates.
- [ ] Add or verify preview smoke tests for route boot, auth entry, Fresh Flow hub, News/Posts, Shorts, creator tools, and admin denial.
- [ ] Keep deployment and migration changes traceable to a release note.
- [ ] Maintain one known-good rollback deployment and document rollback steps.
- [ ] After every release, run HTTP smoke tests and record the exact URL, time, status, and SHA.
- [ ] Prevent a green workflow from being described as end-to-end or device verified unless those tests actually ran.

**Evidence to collect:** CI run links, deployment record, smoke-test output, commit SHA, rollback target.

## Workstream B — Production observability and incident response

- [ ] Define structured, redacted logs for API errors, media processing, auth denials, message failures, realtime subscription failures, and payment reconciliation.
- [ ] Add request/correlation IDs across browser actions, API routes, and background workers where supported.
- [ ] Track real service health: availability, error rate, latency, queue age, worker failures, and provider outages.
- [ ] Separate user-safe messages from diagnostic details; never render raw stack traces or secrets.
- [ ] Define severity levels, incident owner, user impact, mitigation, and follow-up review.
- [ ] Add operational alerts only for actionable thresholds; avoid noisy success-event alerts.
- [ ] Ensure admin status comes from live probes/records, not hard-coded green badges.

**Evidence to collect:** example redacted event, health probe, failure drill, alert route, incident runbook.

## Workstream C — Identity, authorization, privacy, and data governance

- [ ] Inventory every API route, RPC, table, storage bucket, realtime topic, and privileged server action.
- [ ] For each resource, record actor, ownership rule, read/write permission, anonymous behavior, and service-role boundary.
- [ ] Verify deployed migrations and effective RLS policies against the live schema before changing access.
- [ ] Check admin authorization server-side even if the UI hides admin controls.
- [ ] Verify connection-only direct messages, blocked-user behavior, private media, and per-user realtime authorization.
- [ ] Review auth settings, session expiry, password protection, redirect allowlists, and account recovery.
- [ ] Define data retention/deletion/export behavior for profiles, messages, media, telemetry, and financial records.
- [ ] Keep sensitive credentials in deployment secrets; rotate any credential that may have been exposed.

**Safety rule:** do not apply broad RLS or grants changes from source inspection alone. First establish the intended access matrix and current live grants/policies.

## Workstream D — Fresh Flow content lifecycle

For each destination (Shorts, News/Posts, Long Videos, Podcasts, AR/VR, Others), verify its actual supported capability separately.

- [ ] Create draft → validate media/content → upload → process → publish → discover → open detail → interact → share → reload.
- [ ] Persist processing states and show recoverable errors rather than indefinite spinners.
- [ ] Enforce ownership and moderation on every write.
- [ ] Verify signed/private media URLs, content type/size limits, storage cleanup, and retry-safe uploads.
- [ ] Ensure filters and pagination do not duplicate or silently skip records.
- [ ] Verify deletion, unavailable/private shared posts, and return-to-feed navigation.
- [ ] Do not present a workspace placeholder as an implemented media pipeline.
- [ ] For unsupported AR/VR capabilities, clearly explain device/provider requirements and offer a safe fallback.

**Evidence to collect:** two-account test, durable reload test, storage-policy check, slow-network test, failed-upload retry.

## Workstream E — Shorts playback and performance

- [ ] Verify one active video at a time, correct snap/index behavior, bounded prefetch, and release of distant media.
- [ ] Test play/pause, muted state, captions, reaction, comment, follow, save, share, gift, and report flows.
- [ ] Test app background/foreground, route changes, interrupted network, expired URLs, and retry.
- [ ] Measure first-frame time, page-load weight, playback failures, memory pressure, and long tasks.
- [ ] Check battery/data use on a lower-end Android device and narrow viewport.
- [ ] Confirm telemetry is sampled/redacted and never includes private content or auth tokens.

**Evidence to collect:** production gate, browser/device test record, measured performance baseline, failure/recovery result.

## Workstream F — Communication and notifications

- [ ] Test two independent accounts through request → accept → send → receive → read → reload.
- [ ] Verify unauthorized conversation reads/writes fail server-side.
- [ ] Add visible pending/sent/failed states and safe retry without duplicate messages.
- [ ] Verify realtime subscription authorization, status errors, reconnect, and cleanup on sign-out/route changes.
- [ ] Test block, report, mute, and privacy settings against both UI and backend.
- [ ] Distinguish stored message success from realtime delivery; do not infer one from the other.
- [ ] Verify notification persistence, deduplication, read state, and user preferences.

## Workstream G — Treasury, gifts, monetization, and payouts

- [ ] Define the ledger as authoritative; never derive balances from UI state or client events.
- [ ] Test transaction atomicity, idempotency keys, concurrent sends, insufficient funds, reversal, and reconciliation.
- [ ] Verify sender debit, recipient credit, fees, receipt uniqueness, and audit record in one consistent flow.
- [ ] Keep provider sandbox and live settlement visibly distinct.
- [ ] Validate creator eligibility, supported countries/rails, identity/compliance checks, limits, disputes, refunds, fraud review, and payout status.
- [ ] Restrict financial RPCs and service-role credentials to server-side code.
- [ ] Do not enable live payouts until real provider configuration, legal/compliance requirements, and reconciliation have been reviewed.

**Evidence to collect:** invariant tests, duplicate/replay test, sandbox receipt, reconciliation report, authorization denial tests.

## Workstream H — Fresh Live provider integration

Current source evidence: src/features/workspaces/LiveWorkspace.tsx renders an EcosystemPlaceholder; Fresh Live is therefore not yet a real streaming product.

- [ ] Select a provider based on supported regions, ingest protocol, playback, pricing, latency, recording, moderation, and mobile support.
- [ ] Confirm credentials, plan limits, and environment variables without exposing secrets to the client.
- [ ] Implement server-created sessions and authenticated host authorization.
- [ ] Implement ingest/publish, viewer playback, live chat, moderation, disconnect/reconnect, end-session, and replay lifecycle.
- [ ] Persist session states and reconcile provider webhooks/events idempotently.
- [ ] Add operational metrics for active sessions, ingest failures, playback errors, latency, and provider availability.
- [ ] Gate launch behind provider sandbox tests and an explicit rollout flag.
- [ ] Until this is done, label the surface as planned/preview or keep it out of the default live-product path.

## Workstream I — Admin and support operations

- [ ] Show deployed SHA, release time, CI state, live health checks, failed jobs, media queue failures, and provider status.
- [ ] Show moderation/report queues, account actions, live sessions, payment reconciliation exceptions, and audit events only to authorized roles.
- [ ] Add confirmation and reason capture for destructive or sensitive admin actions.
- [ ] Log actor, target, action, timestamp, result, and correlation ID; avoid storing unnecessary private content.
- [ ] Include pagination, search, empty/error states, retry, and stale-data timestamps.
- [ ] Verify every action via direct API calls with non-admin and expired sessions.

## Workstream J — Accessibility, responsive UX, and product consistency

- [ ] Check text scaling, contrast, visible focus, semantic labels, touch target size, keyboard access, and screen-reader names.
- [ ] Test 320–360 CSS-pixel widths, browser zoom, long labels, large text, and landscape orientation.
- [ ] Eliminate clipped controls, hidden critical actions, accidental horizontal scroll, and navigation dead ends.
- [ ] Ensure each feature has consistent loading, empty, offline, permission-denied, and retry states.
- [ ] Keep primary actions prominent and avoid visual noise; prioritize clear visibility over decorative density.
- [ ] Verify signup/login return to the intended landing experience and that every sub-surface has a clear route back.

## Workstream K — Data, storage, backups, and migrations

- [ ] Maintain a migration inventory and check that migrations are applied in the intended order.
- [ ] Test migrations against a disposable database or schema snapshot before production.
- [ ] Check storage bucket policies, file limits, cleanup, signed URL expiry, and orphaned records.
- [ ] Establish backup coverage, retention, and a documented restore rehearsal for critical data.
- [ ] Verify idempotent migration behavior where applicable and document irreversible changes.
- [ ] Monitor database errors, slow queries, connection limits, and storage growth.

## Workstream L — Dependencies, supply chain, and cost control

- [ ] Track dependency audit findings and classify by reachable exposure, severity, and fix compatibility.
- [ ] Pin and review critical build/runtime dependencies; avoid unreviewed install scripts and unnecessary packages.
- [ ] Verify secret scanning and ensure no private keys/tokens are committed.
- [ ] Establish budgets/limits for media processing, storage, egress, AI usage, and streaming.
- [ ] Add quota and abuse protections to expensive endpoints and uploads.
- [ ] Use feature flags/kill switches for provider-backed or high-cost features.
- [ ] Track actual cost per published media item, active creator, live minute, and AI operation when usage data is available.

## Cross-workstream release checklist

- [ ] Scope and acceptance criteria are recorded.
- [ ] Source changes are committed and reviewed.
- [ ] Automated checks pass on the exact SHA.
- [ ] Authorization and negative-path tests pass.
- [ ] Migration/provider prerequisites are verified.
- [ ] User-facing loading, empty, error, offline, and retry behavior is present.
- [ ] Narrow-screen and accessibility checks pass.
- [ ] Exact SHA is deployed and production HTTP smoke tests pass.
- [ ] Critical journeys are tested with independent accounts.
- [ ] Monitoring and rollback are ready.
- [ ] Any unverified device/provider/compliance requirement is explicitly marked as a blocker.

## Current verified baseline on 2026-10-13

- Commit b34e5b1605362bfded2fbf889973af089fb9dce9 passed the GitHub main build gate and Fresh Shorts production gate.
- Vercel reported a READY production deployment for that exact commit.
- The deployment root returned HTTP 200.
- These checks do not establish real-device verification, live Supabase policy correctness, actual payment settlement, or a working Fresh Live provider.
