# Fresh Flow — Whole Media Platform Blueprint

**Status:** Architecture baseline for implementation; not a claim that the described capabilities already exist.
**Scope:** All media formats, creation and consumption workflows, live experiences, distribution, interaction, accessibility, creator/developer tooling, and platform operations.
**Governing rule:** The catalog is open-ended. This document describes capability families, not an exhaustive finite list. New media types must be addable without redesigning the entire product.

## 1. Product definition

Fresh Flow is the media operating environment inside Fresh Web Lite. It is not a finite list of six tabs and must not be architected as one. The existing Home/Shorts, Long Videos, News/Posts, AR/VR, Podcasts, and Others destinations are entry points and familiar experiences only. The underlying system must support a registry-driven, extensible media universe.

Design for the complete range of current and future media: text, documents, images, illustrations, memes, GIFs, stickers, audio, music, speech, podcasts, short/long/interactive video, livestreams, 3D assets, spatial media, AR/VR/MR, real-time shared experiences, and future formats. Support creation, editing, import, export, discovery, playback, reading, listening, participation, publishing, collaboration, distribution, archiving, and permitted offline use.

No claim of "all media complete" is valid until supported capabilities are inventoried, status-labelled, tested, and verified against real providers/devices where required.

## 2. Workstreams run together

These are parallel engineering workstreams with explicit integration contracts. "At the same time" means design and implementation advance together behind shared interfaces—not that unsafe database, UI, and production changes are made blindly in one commit.

1. **Product research and architecture:** capability inventory, user journeys, provider/device dependencies, decisions, and status register.
2. **Design system and wireframes:** mobile-first information architecture, responsive screens, design tokens, reusable UI primitives, interaction states, clickable prototypes.
3. **Frontend:** routes, media surfaces, creator workspace, developer portal, admin console, settings, accessibility and low-bandwidth modes.
4. **Backend/API:** authenticated APIs, media orchestration, event ingestion, policy enforcement, queues, rate limits, retries, audit events.
5. **Database and storage:** versioned migrations, tenant/user ownership, RLS, metadata registry, media assets, jobs, analytics, retention, backups.
6. **Identity and security:** independent user profiles, roles, sessions, device management, permission scopes, encryption, key handling, abuse prevention.
7. **Media infrastructure:** uploads, resumable transfer, validation, transcoding, thumbnails, adaptive streaming, CDN/provider adapters, captions/transcripts, failure recovery.
8. **Creator/developer tooling:** studio, analytics, content management, API keys, app registration, webhooks, sandbox, quotas, documentation, logs.
9. **Admin and operations:** role-protected moderation, reports, takedowns, provider health, queue health, configuration, audit logs, support tools.
10. **Fresh AI assistant:** contextual help, search and discovery assistance, creation assistance, accessibility support, developer help, moderation assistance with human review; tool permissions must be explicit.
11. **Quality and release:** unit/integration/e2e/contract tests, accessibility checks, mobile and low-bandwidth checks, observability, rollback and production verification.

## 3. Open media capability model

Use a data-driven registry rather than a closed union of media categories. A media capability descriptor should support:

- stable id, version, display metadata, tags and discoverability;
- MIME/container/codec and format adapters where relevant;
- allowed actions (create, upload, view, play, listen, edit, remix, share, download, embed, live, collaborate);
- renderer/player/editor adapter references;
- required backend services and provider/device prerequisites;
- accessibility features (captions, transcript, keyboard/touch/assistive support, text alternatives);
- rights/licensing, privacy classification, retention, age/safety rules;
- processing pipeline and job status;
- feature flags, compatibility and graceful fallback;
- telemetry and test contract.

New media types should be added through validated registration and adapter contracts. Never trust client-supplied capability declarations as authorization. The server validates file signatures, MIME, size, quotas, rights and permitted actions.

## 4. Live media is a platform capability

Live is not one screen or one media type. The platform must be extensible to broadcast, multi-host/guest streams, audio rooms, calls, live podcasts, gaming/esports, sports, breaking news, music/concerts, education, worship, conferences, community events, shopping, auctions, Q&A, co-creation and future real-time formats.

Shared live primitives: session lifecycle, host/co-host/speaker/viewer roles, invitations and moderation, audience interaction, chat/reactions, optional recording, stream ingest and egress adapters, latency/quality telemetry, reconnect behavior, captions, reporting, rights checks, and region/provider availability. Calls and broadcasts may require distinct protocols and providers; do not pretend a video element or static preview is a live system. Each live type needs a real provider/device dependency record, permission flow, failure states, and contract tests.

## 5. Independent user and creator identities

Keep the personal user profile separate from creator/business/developer workspace data. One authenticated person may own or be invited to multiple workspaces without duplicating their personal identity.

- **Personal profile:** account identity, user-controlled profile fields, preferences, language, accessibility settings, privacy, sessions/devices, blocked accounts and data controls.
- **Creator workspace:** public creator identity, channels, media library, drafts, publishing rights, team members, analytics, monetization eligibility and payouts where supported.
- **Developer workspace:** projects/apps, environments, API credentials, webhooks, scopes, quotas, logs, test fixtures and documentation.
- **Admin/operator identity:** separate privileged role assignment and audited access; no hidden privilege based on ordinary profile fields.

Enforce ownership and role checks on the server and in database policies. Hiding a UI button is not authorization. Workspace membership and roles must be independently revocable.

## 6. Encryption and privacy baseline

- TLS for network traffic and provider connections.
- Managed encryption at rest for database, object storage, backups and logs where supported.
- Keep secrets server-side; never ship service-role keys or provider secrets to the browser.
- Hash/rotate API credentials; show a secret only at creation; support revoke/rotate and scoped credentials.
- Use least-privilege authorization, row-level security, tenant isolation, rate limiting, CSRF protections where applicable, upload scanning, safe URL handling and audit events.
- Distinguish platform-managed encryption at rest from end-to-end encryption. E2EE must be explicitly designed and tested for each supported communication flow; do not label media or messages E2EE merely because TLS/storage encryption exists.
- Document key ownership/recovery, device changes, export/deletion, retention and legal/rights takedown behavior.
- Minimize telemetry and never log passwords, tokens, private message bodies, raw private media, or unnecessary user identifiers.

## 7. Data architecture principles

Prefer additive, reversible migrations. Before schema changes, inspect existing tables, policies, grants, triggers, RPCs and migrations. Never assume table absence or create a parallel table without reconciling current schema.

Core logical entities (map to existing schema before creating anything):
- profiles and account preferences;
- workspaces, memberships and role grants;
- media capability definitions and adapters;
- media items, revisions, renditions and asset references;
- publication records, audience/visibility and rights;
- upload/transcode/thumbnail/caption jobs;
- live sessions, participants, events and recordings;
- comments/reactions/saves/follows/collections;
- reports, moderation decisions, appeals and audit events;
- developer apps, environments, scoped credentials, webhooks and usage;
- provider health, delivery metrics and operational incidents.

Every user-owned row needs explicit ownership/tenant semantics, appropriate RLS, and tests for anonymous, owner, member, other-user and privileged access. Large binary media belongs in object storage or a media provider, not in relational rows; the database stores metadata and references.

## 8. Frontend, wireframes and UI contract

Build reusable, accessible primitives and consistent states before duplicating layouts. Required screen families:
- Fresh Flow discovery and universal search;
- every registered media renderer/player;
- live lobby, preflight permissions, live room, reconnect/error and post-live summary;
- creator studio: capture/import, edit/compose, drafts, schedule, publish, rights, library and analytics;
- developer dashboard: projects, environments, keys, APIs, webhooks, logs, quotas and docs;
- admin dashboard: moderation queue, reports, policy actions, service/provider health, job queues, audit and role management;
- independent profile, privacy, accessibility, sessions/devices and workspace switcher;
- Fresh AI assistant in contextual, permissioned surfaces.

All key views need loading, empty, success, offline, denied-permission, unsupported-format, upload-failed, processing, retry, rate-limit and server-error states. No inert controls: a control is implemented only when its action works or it is explicitly disabled with an explanation.

## 9. Accessibility, inclusion and low-bandwidth design

Target WCAG 2.2 AA as a project goal, validated with automated and manual checks; do not claim conformance from automated scans alone.

- semantic landmarks, labelled controls, logical focus order, visible focus and keyboard operation;
- screen-reader names and status announcements; captions, transcripts and alt text;
- adequate contrast, scalable text, reduced motion, no color-only meaning;
- large touch targets and no clipped/hidden primary controls on small Android screens;
- localized strings, Unicode-safe text, timezone-aware scheduling and RTL readiness;
- adaptive image/video quality, explicit data saver, pause autoplay, low-motion/low-memory modes;
- resumable uploads, retries with bounded backoff, offline-aware queues where safe;
- graceful fallback when codecs, camera/microphone, AR/VR hardware, browser APIs or providers are unavailable;
- avoid making advanced hardware or paid services prerequisites for basic reading, posting, or discovery.

## 10. Fresh AI assistant boundaries

Assistant functions must be tool- and role-scoped. The assistant can explain workflows, help draft or edit media, summarize a user's authorized library, suggest captions/translations, support developers with docs and test results, and assist moderation triage. It must not bypass RLS, reveal private content across users/workspaces, execute privileged actions without explicit authorization, or invent provider availability. Destructive actions require confirmation and auditability. AI output is not a substitute for copyright, safety, or human-review policy.

## 11. Admin and operations boundaries

Admin interfaces must be server-authorized, audited and least-privilege. Separate support, moderation, billing, security and infrastructure capabilities where feasible. Protect user privacy; do not provide unrestricted browsing of private messages/media as a convenience feature. Use scoped case access, reason codes, expiry and audit trails. Secrets and encryption keys must not be visible in ordinary admin dashboards.

## 12. Provider and environment strategy

Keep local/test, preview and production configuration separate. Use free tiers where feasible, but document quotas, sleep/cold-start behavior, storage limits, bandwidth limits and egress costs. No provider is assumed to be unlimited or permanently free.

Create provider adapters for storage, transcoding, streaming/live, notifications, search and AI. Each adapter must report capabilities, health, limits and unavailable features. Do not hard-code provider assumptions into UI. Never deploy migrations or secrets blindly to production. Use example env files containing names/placeholders only, and validate required variables at startup without printing their values.

## 13. Implementation and verification sequence

Parallelize discovery, wireframes, contracts, data review, UI primitives and test design. Integrate in small, reviewable pull requests:

1. Baseline: inventory routes/components/APIs/schema/migrations/RLS/provider adapters/CI; record actual production and test status.
2. Contracts: publish capability registry, API types, role model, media job states, error vocabulary and telemetry privacy contract.
3. Foundations: accessible design tokens/primitives, workspace identity model, authorization helpers, migrations and RLS tests.
4. Vertical slice: deliver one real end-to-end media workflow (upload → validated processing → stored metadata → playback → interaction) using existing providers.
5. Extend by adapter/format, including live session lifecycle only after provider/protocol validation.
6. Build creator, developer and admin surfaces against real APIs and server-enforced roles.
7. Add assistant tools with scoped permissions and audit coverage.
8. Run lint, typecheck, relevant contracts, integration tests, production build, accessibility checks and mobile/low-bandwidth tests.
9. Deploy preview; verify actual browser flows, logs, storage, authorization and rollback; only then merge/deploy production.
10. Update readiness register with evidence and remaining blockers.

Do not create a second Shorts runtime, duplicate existing subsystems, invent APIs, silently change existing routes, or overwrite production data. Reconcile with existing Fresh Flow code and the communication/completion register before implementation.

## 14. Definition of done

For each capability record: status (Verified / Implemented—needs verification / Partial / Provider- or device-blocked / Not implemented / Deferred), owner, source paths, API and schema dependencies, authorization model, tests, known limits, and verification evidence.

A capability is **Verified** only when:
- user journey works end-to-end;
- authorization and cross-user isolation pass;
- data persists and failure/retry behavior works;
- keyboard/screen-reader/touch and responsive behavior are checked;
- relevant automated tests and production build pass;
- preview/production route and real provider/device behavior are verified where applicable;
- logs/telemetry avoid sensitive data and rollback is understood.

The platform architecture is extensible by design; the checklist is an evolving register, not a claim that every future invention is already implemented.
