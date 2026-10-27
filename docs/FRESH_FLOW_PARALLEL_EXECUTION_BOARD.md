# Fresh Flow — Parallel Execution Board

**Owner:** Fresh Web Lite engineering
**Baseline PR:** #153 (whole-media architecture)
**Operating mode:** parallel discovery/design/contracts, integrated through reviewed vertical slices
**Status semantics:** Proposed ≠ implemented; implemented ≠ verified; verified requires recorded evidence.

## Mission

Deliver Fresh Flow as an extensible media ecosystem, not a fixed menu. The existing six destinations remain entry points only. The capability system must allow new formats and experiences to be added through adapters and policy-checked registrations rather than a redesign of navigation or a closed TypeScript union.

## Parallel workstreams and shared contracts

| Workstream | Deliverables | Dependencies / acceptance evidence |
|---|---|---|
| Product and capability research | Open-ended capability inventory, journey maps, provider/device dependency map, capability status register | Each capability has a user outcome, owner, implementation state, dependencies and verification method |
| UX, design system, wireframes and prototypes | Mobile-first screen maps; reusable tokens/components; clickable prototypes; loading/empty/offline/error states | Small-screen Android review; keyboard/focus review; no inert controls; prototype actions map to API contracts |
| Frontend | Discovery, playback/renderers, live lobby/room, creator studio, developer console, admin console, profile/workspace switching | Responsive states; loading/error/retry; reduced motion; no secret or authorization logic in client |
| Backend and API | Authenticated APIs, upload orchestration, media jobs, publication, live lifecycle, webhooks, audit events | Input validation, role checks, idempotency, rate limits, bounded retries, structured non-sensitive logs |
| Database and storage | Schema mapping, additive migrations, RLS, asset metadata, jobs, workspace membership, audit records | Inspect live schema first; owner/member/other-user/admin tests; migration rollback plan; no binary blobs in relational rows |
| Identity, privacy and encryption | Independent personal profile and workspace identity; sessions/devices; key and credential lifecycle | Server-side authorization; TLS and managed at-rest encryption; scoped secrets; E2EE only when a real protocol is implemented and tested |
| Media infrastructure | Upload/resume, file validation, thumbnails, transcode/renditions, adaptive playback, captions/transcripts, live-provider adapters | Actual provider contract tests; format/size limits; processing status; failure recovery; costs and quotas visible |
| Creator workspace | Library, drafts, editor/compose entry points, scheduling, publishing, audience, analytics, rights, monetization eligibility | Creator data separated from personal profile; explicit permissions; actual persistence; no simulated earnings |
| Developer workspace | Projects, environments, API keys, scopes, usage quotas, logs, webhooks, docs, sandbox | Keys shown once, hashed at rest, revocable and scoped; secrets never sent to browser logs |
| Admin/operator workspace | Moderation queue, reports, takedowns, appeals, provider/job health, audited role management | Server-authorized least privilege; reason codes; case-scoped access; no unrestricted private-message browsing |
| Fresh AI assistant | Contextual user help, media drafting, captions/translation, creator assistance, developer documentation and moderation triage | Tool permissions are explicit; private data follows the same access policy; destructive actions require confirmation; human review for moderation |
| Accessibility and inclusion | WCAG 2.2 AA target; captions, transcripts, alt text, scalable text, focus, screen-reader labels, localization, RTL readiness | Automated checks plus manual assistive-tech review; contrast and touch targets; no color-only meaning |
| Low-bandwidth and device support | Data saver, adaptive media, resumable uploads, offline-aware queues, reduced-motion/low-memory fallback | Test throttled network and failed requests; basic browse/read/post must not require premium hardware |
| Monetization and creator economy | Eligibility, offers, subscriptions/memberships, ads, tips, tickets, commerce, licensing, payouts and ledger contracts | Feature-by-feature legal/provider availability; transparent fees; idempotent ledger; fraud/refund/chargeback handling; no false balance display |
| Quality, security and release | Unit/contract/integration/E2E tests, accessibility checks, preview validation, observability and rollback | Lint, typecheck, build and relevant tests pass; deployed user journey and authorization verified before status becomes Verified |

## Wireframe and prototype inventory

Produce wireframes and interaction prototypes for these families in parallel, using shared design tokens and real state definitions:

1. **Media discovery:** universal search, category/topic filters, following, history, saved items, recommendations, accessible list/grid options.
2. **Playback/rendering:** short vertical, long-form player, audio/podcast player, image/document viewer, gallery, interactive/3D/spatial viewer, external embed and unsupported-format fallback.
3. **Live:** discovery/lobby, device and permission preflight, create/join, host/co-host/speaker/viewer states, chat/reactions, report/block, network reconnect, recording consent, end-of-session summary.
4. **Create/studio:** capture/import, upload progress, draft editor, metadata/alt text/captions, rights/visibility, scheduling, publish confirmation, processing failure and retry.
5. **Personal account:** profile, privacy, language, accessibility, blocked accounts, session/device list, export/delete controls.
6. **Workspace switcher:** personal identity, creator workspace, developer workspace and authorized admin/operator role; membership and permission visibility.
7. **Creator dashboard:** library, drafts, publication calendar, analytics, audience, claims/rights, monetization eligibility, transactions and payout status.
8. **Developer dashboard:** projects, dev/staging/prod environments, API credentials, permissions/scopes, webhook delivery, API logs, quotas, SDK/docs and test sandbox.
9. **Admin dashboard:** reports/moderation, appeals, policy actions, queue/provider health, incident timeline, audited access and role management.
10. **Fresh AI assistant:** contextual drawer/panel, permission disclosure, sources/actions, cancel/undo where possible, confirmations and error states.

Every prototype must include loading, empty, offline, permission denied, unsupported device/format, validation error, upload failure, processing, retry, rate-limit and server-error states. Prototypes are design evidence, not proof that backend behavior exists.

## Identity, ownership and security contracts

- One person has one authenticated personal identity and may own or join multiple workspaces.
- Creator/developer/admin capabilities are workspace memberships or server-assigned roles, not self-editable profile flags.
- Profile fields, public creator identity, team membership, API credentials, billing records and admin audit records have distinct ownership and privacy rules.
- All sensitive APIs validate identity, workspace membership, role, resource ownership and requested action on the server.
- Use TLS in transit and managed encryption at rest where supported. Secrets remain server-side. Credentials are scoped, hashed/otherwise securely stored, rotated and revocable.
- E2EE is a separate feature requiring protocol design, client key lifecycle, device recovery and interoperability tests; TLS or database encryption is not E2EE.
- Admin access is least-privilege, case-scoped and audited. Do not expose secret keys or encryption keys in dashboards.
- Migrations are additive and reversible where possible. Inspect current schema, grants, RLS, triggers and migration history before changing the database.

## Monetization contract

Support multiple business models without making any one provider mandatory: ads, creator memberships, subscriptions, tips, paid content, tickets/events, commerce, licensing, sponsorships, enterprise APIs and optional premium tools. Each model must be independently enabled only where legally and technically supported.

Before showing revenue or payout as real, require a provider-backed transaction or an auditable internal ledger event. Define currency, fee, tax, refund, chargeback, fraud, payout eligibility, country availability and reconciliation rules. Display estimated versus settled amounts distinctly. Never promise earnings or invent transaction status. Keep basic access available to users and creators who cannot pay.

## Environments and delivery

- **Local/test:** fixtures, mocked provider adapters clearly marked as test-only, no production credentials.
- **Preview/staging:** isolated test data and least-privilege secrets; migrations and integration checks run before user review.
- **Production:** explicit approvals, migration plan, monitoring, rollback route, cost/usage guardrails.
- Environment variables are names/placeholders only in documentation; validation must not print secret values.
- Free-tier constraints (sleep, quota, egress, storage, concurrency and media processing limits) must be measured and disclosed. Do not assume free means unlimited.

## Integrated delivery sequence

Workstreams advance simultaneously, but merge in safe vertical slices:

**Slice A — Baseline and contracts:** inventory current routes, components, schema/RLS, providers, jobs, test scripts, CI and production status; add capability descriptor/registry contract and status register.

**Slice B — First verified media vertical:** select an existing supported format and implement/verify upload → validation → storage metadata → processing/rendition → playback → interaction. Reuse current providers; no duplicate Shorts runtime.

**Slice C — Shared account/workspace foundations:** independent profile/workspace identity, membership/role authorization, RLS and tests; profile and workspace switcher wireframes/prototype.

**Slice D — Creator workflow:** drafts, publishing, creator dashboard and real analytics, each connected to persistent APIs.

**Slice E — Live platform foundation:** provider/protocol decision and live session state machine first; then preflight, host/viewer flows, reconnect, moderation and contract tests. A static UI or ordinary video tag does not count as live.

**Slice F — Developer/admin/AI:** scoped developer credentials and logs; audited admin operations; permissioned assistant tools.

**Slice G — Monetization:** eligibility and provider/country matrix; ledger and reconciliation; transparent UI; only then real transactions/payouts.

**Slice H — Extend capability catalog:** add formats and experience adapters, with accessibility, rights, safety, tests and provider dependencies for each.

## Release gate

For every shipped capability record: status, owner, code paths, API, schema/migration, RLS/authorization tests, UI states, accessibility evidence, provider/device requirements, CI/build result, preview URL, production result, known limits and rollback procedure.

A successful deployment badge alone does not verify user flows. A mock is not a live provider. A visible dashboard is not a connected backend. A money figure is not a payment. A security label is not evidence of encryption. Use **Verified** only after end-to-end evidence exists.
