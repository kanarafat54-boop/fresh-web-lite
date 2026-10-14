# Fresh Communication + Fresh Flow — Master Completion Register

**Status:** Master scope and acceptance register; not a claim of implementation completion  
**Initial web origin:** `https://fresh-web-lite.vercel.app`  
**Custom domain:** Deferred; do not purchase or configure one in this phase  
**Baseline:** Repository `main`; Fresh Flow readiness review dated 2026-10-13 and Fresh Identity/Mail audit dated 2026-10-14  
**Operating rule:** A feature is complete only when implementation, authorization, persistence, error/retry behavior, accessibility, automated checks, and deployment verification pass. Provider- or device-dependent evidence must be recorded separately.

## 1. Product decision

Build one connected user experience with two coordinated product areas:

- **Fresh Communication:** one Fresh ID and a unified inbox over purpose-built services for external email, internal chat, groups, calls, files, notifications, search, collaboration and AI.
- **Fresh Flow:** one media operating system with six worlds: Fresh Shorts (home), Long Videos, News / Posts, AR / VR, Podcasts and Others.

Use `fresh-web-lite.vercel.app` as the initial origin. Do not bind product architecture to that hostname; all external URLs, callback URLs, email sender identities and public share links must be centrally configurable so a future custom domain is a migration/configuration task rather than a rewrite.

Unify navigation, identity, permissions, search, notifications, observability and design language. Do not collapse mail, chat, calls, media assets, financial ledger entries and AI sessions into a single generic database table.

## 2. Status vocabulary

- **Verified:** acceptance tests passed and evidence recorded against the exact commit/environment.
- **Implemented / verify:** source code exists, but the complete user journey and production behavior are not yet proven.
- **Partial:** only some paths or layers exist.
- **Blocked by provider/device:** code can be prepared, but real-world proof requires a provider, domain/DNS, hardware, credentials or an explicit cost decision.
- **Not implemented:** no complete working capability is present.
- **Deferred:** intentionally sequenced later; it remains on the register and cannot be silently treated as complete.

No feature may be marked Verified from a component's existence, a mock/demo response, or CI/build success alone.

## 3. Fresh Communication feature register

| ID | Capability | Required scope / acceptance | Baseline status |
|---|---|---|---|
| COM-01 | Fresh ID | Sign-up, sign-in, sign-out, email confirmation, session restore, recovery, duplicate-identity handling, age/consent validation, safe redirects and app entry | Implemented / verify; PR #51 requires real E2E |
| COM-02 | Profile and identity privacy | Username uniqueness, public/private profile separation, user-controlled visibility, verified contact methods, export/deletion | Partial; audit private-profile boundary |
| COM-03 | Session and account security | Session/device list, revoke sessions, suspicious login events, MFA/passkeys where supported, password hardening and recovery safeguards | Partial; leaked-password protection was flagged disabled |
| COM-04 | Unified inbox | Inbox, filters, unread, starred, pinned, archive, snooze, drafts, priority, bulk actions, keyboard/touch navigation and empty/error/loading states | Not implemented as a complete unified inbox |
| COM-05 | External Fresh Mail | Real external send/receive, Inbox/Sent/Drafts/Archive/Spam/Trash, compose/reply/reply-all/forward, CC/BCC, threading, attachments and delivery states | Not implemented; no provider integration verified |
| COM-06 | Mailbox lifecycle | Address/alias rules, mailbox quotas, signatures, folders/labels, rules/filters, auto-replies, scheduling, import/export and retention | Not implemented |
| COM-07 | Mail infrastructure | Configurable provider adapter, inbound routing, signed webhook verification, replay/idempotency, durable outbound jobs, bounce/complaint handling and provider error mapping | Not implemented / provider proof required |
| COM-08 | Domain readiness | Start with current Vercel origin; centralize origins and callbacks; later verify ownership, SPF, DKIM, DMARC, MX, sender reputation and migration plan | Domain purchase deferred; external email cannot be claimed ready |
| COM-09 | Direct chat | Secure user-to-user messages, durable history, delivery/read state, retry, blocking/reporting and two-account authorization tests | Existing service/tables; E2E and policy verification incomplete |
| COM-10 | Group chat and communities | Group creation, invitations, roles, membership checks, announcements, moderation, pinned messages and ownership transfer | Partial / verify before expansion |
| COM-11 | Realtime and presence | Typing, online state, unread counts, reconnect, duplicate/out-of-order event handling and private-topic authorization | Partial; authorization and live behavior not proven |
| COM-12 | Contacts | Fresh contacts, external email contacts, search, favorites, deduplication, import/export, invitations and consent-based device sync | Partial / not verified |
| COM-13 | Attachments and files | Private storage, access-controlled previews/downloads, size/type limits, upload retry, malware scanning integration where available, expiring/revocable links | Partial; end-to-end access review required |
| COM-14 | Search and history | Permission-aware search over mail/chat/groups/contacts/files; filters, result highlighting, jump-to-message, history controls | Not implemented as one complete cross-service search |
| COM-15 | Notifications | In-app inbox, per-service preferences, push/email options where configured, quiet hours, grouping, security alerts and retry/error states | Partial |
| COM-16 | Voice and video | Voice notes, one-to-one calls, group calls, video, call history, permissions, reconnect, captions, recording disclosure and meeting controls | Not implemented as a complete call service |
| COM-17 | Fresh AI for communication | Drafts, tone/grammar, summaries, translation, action extraction and reminders; permission-scoped context and explicit user approval before sending | Partial; permission boundary and real journeys required |
| COM-18 | Calendar and tasks | Events from messages, invitations/RSVP, time zones, reminders, shared calendars, tasks/assignments and meeting links | Not implemented as an integrated journey |
| COM-19 | Business/team communication | Shared inbox, aliases, delegated access, roles, assignment/escalation, internal notes separated from external messages and audit trails | Not implemented |
| COM-20 | Admin and operations | Queue/webhook health, delivery/bounce metrics, abuse queues, audit logs, rate limits, storage/usage, provider status and least-privilege controls | Partial |
| COM-21 | Interoperability | Mail import/export, contact/calendar integration, approved APIs/webhooks, scoped OAuth and connection revocation | Not implemented / future integrations |
| COM-22 | Privacy, abuse and governance | RLS plus least-privilege grants, server authorization, anti-spam/rate limits, reporting/blocking, retention/deletion, redacted logs, secret boundaries and incident handling | High-priority review required |
| COM-23 | Accessibility and mobile UX | Large readable text, clear labeled controls, touch targets, screen readers, keyboard/focus, high contrast, responsive layout, low-bandwidth and low-memory handling | Must verify across both systems |
| COM-24 | Reliability and recovery | Idempotency, retries, dead-letter visibility, backups, monitoring, migration discipline, rollback and incident runbooks | Partial |

## 4. Fresh Flow feature register

| ID | Capability | Required scope / acceptance | Baseline status |
|---|---|---|---|
| FLOW-01 | Unified Flow shell | Six destinations, contextual Flow Switch, global search/voice/translate/share/save/history/follow/notifications/AI, back navigation and route restoration | Implemented / verify |
| FLOW-02 | Fresh Shorts home | Vertical native scroll, one active player, active-only playback, bounded media window, pagination, resume, adaptive preload and error recovery | Implemented / physical-device verification incomplete |
| FLOW-03 | Shorts interactions | Likes, saves, follows, comments, replies, shares, reactions, gifts where enabled; durable persistence, duplicate prevention and consistent state across surfaces | Partial / cross-surface E2E required |
| FLOW-04 | Long Videos | Long-form upload/ingest, processing, playback, resume, captions, quality adaptation, recommendations, permissions and error recovery | Surface exists; real pipeline not proven |
| FLOW-05 | News / Posts | Source-aware news and posts, readable article/post view, author/source attribution, publish → feed → react/comment/save/share → reload persistence | Surface exists; source and full journey verification incomplete |
| FLOW-06 | AR / VR | Capability detection, device support, immersive mode, spatial controls where supported, fallback experience, permissions and graceful unsupported-device behavior | Surface exists; real capability not proven |
| FLOW-07 | Podcasts | Show/episode catalog, audio-first playback, persistent mini-player, background playback where supported, resume, speed, queue and playback error recovery | Surface exists; real audio pipeline not proven |
| FLOW-08 | Others / formats | Images, stories, music, interactive and future formats; each format must have a real source/viewer, permissions, interactions and explicit unsupported states | Extension surface only |
| FLOW-09 | Discovery and ranking | For You, Following, Trending, topics and learning modes; relevance, freshness, affinity, diversity, quality and deterministic pagination | Runtime contracts exist; quality/production outcomes need verification |
| FLOW-10 | Search and intent | Search across media, people and topics; filters; voice entry where supported; translation; engine/source selector; query recovery and accessible results | Partial / journey verification required |
| FLOW-11 | Publishing and Creator Studio | Draft, upload, processing state, metadata, caption/thumbnail, preview, publish/schedule, distribution, edit/delete and failure recovery | Tooling exists; complete publish-to-distribution journey unproven |
| FLOW-12 | Media pipeline | Upload validation, private staging, processing/transcoding, thumbnails, captions, optional dubbing/repurposing, moderation, publish states and retry | Not proven as production-grade end-to-end |
| FLOW-13 | Media delivery and performance | CDN/provider-backed delivery, adaptive bitrate where applicable, bounded downloads, offline/slow-network behavior, cache strategy, p95/p99 telemetry and memory budgets | Runtime optimizations exist; large-scale infrastructure not proven |
| FLOW-14 | Social graph | Follow/unfollow, profiles, creator identity, connection privacy, block/mute, share links and safe profile surfaces | Partial / cross-route E2E required |
| FLOW-15 | Comments and community | Threaded comments/replies, reactions, moderation, reporting, filters, creator controls, abuse rate limits and realtime updates | Partial |
| FLOW-16 | Personalization and controls | Explicit interests, hide/not-interested, topic controls, feed reset, watch/search history controls, privacy-aware signals and non-addictive defaults | Partial / needs product and test completion |
| FLOW-17 | Notifications | New followers, replies, mentions, processing completion, live events and creator/account alerts with preferences | Partial |
| FLOW-18 | Fresh Live | Real stream creation/ingest, playback, live chat, moderation, reconnect, end/replay, metrics and access controls | Not implemented; placeholder only |
| FLOW-19 | Creator analytics | Views, unique reach definitions, watch time/completion, retention, engagement, traffic source and clear anti-fraud caveats | Partial / metrics require definitions and data proof |
| FLOW-20 | Gifts and monetization | Idempotent ledger, balance invariants, receipts, fees, refunds/disputes, creator eligibility, fraud checks and real settlement evidence | Financial code exists; production readiness unproven |
| FLOW-21 | Rights and safety | Upload rights/consent, copyright reporting, sensitive-content handling, age-appropriate controls, moderation queues, appeals and audit trail | Partial |
| FLOW-22 | Administration | User/media moderation, failed processing jobs, live status, reports, creator/payment investigations, audit logs and least-privilege controls | Basic admin exists; operations console incomplete |
| FLOW-23 | Cross-device continuity | Resume playback, saved state, drafts, notifications and preferences across sessions/devices | Partial / E2E required |
| FLOW-24 | Accessibility and device quality | Readable controls, captions, reduced motion, screen readers, touch/swipe behavior, orientation/resize, background recovery and low-memory Android tests | Physical-device tests incomplete |
| FLOW-25 | Security and data lifecycle | Media reference safety, RLS/storage policy checks, private realtime authorization, consent, retention, deletion and secret boundaries | Requires live-project verification |
| FLOW-26 | Production readiness | Exact commit deployed, automated gates, HTTP route checks, runtime logs, migration status, smoke tests, rollback and device/network evidence | CI exists; not equivalent to full readiness |

## 5. Cross-system requirements

These requirements apply to every capability above:

1. **No dead controls:** every visible action must work, be clearly disabled with a reason, or be labeled as planned.
2. **No fake success:** distinguish local draft, queued, sent, delivered, failed, processed, published and settled states accurately.
3. **Authorization before data:** server-side actor, resource, membership and permission checks; RLS and grants reviewed together.
4. **Private by default:** no cross-account message, contact, attachment, search or realtime leakage.
5. **Real data paths:** demos and fixtures must be labeled and cannot satisfy production acceptance.
6. **Accessible by default:** mobile-first layouts, readable text, explicit labels, touch targets and error recovery.
7. **Bounded resource use:** pagination, cancellation, retries, queue limits and memory limits, especially on constrained Android devices.
8. **Observable but private:** useful operational metrics without logging secrets or message bodies unnecessarily.
9. **Reversible changes:** migrations and deploys need a rollback or forward-repair plan.
10. **Honest release gate:** build success is necessary but not sufficient.

## 6. Execution sequence and gates

### Gate A — Inventory and safety baseline
- Keep this register as the shared source of truth.
- Inspect all relevant routes, services, migrations, grants, RLS policies, storage policies, environment-variable names, deployment configuration and existing tests.
- Establish an implementation map: user action → UI → service/API → database/provider → permission checks → error handling → tests.
- Re-test Fresh ID end-to-end with a dedicated test account.
- Investigate the existing communication message/thread ownership policy and broad grants using negative tests before reusing the tables.
- Do not perform a broad policy cleanup without confirming every table's intended access model.

### Gate B — Secure Fresh ID and internal messaging
- Resolve identity session/navigation defects.
- Verify signup, email confirmation, duplicate username, password mismatch, minimum-age validation, sign-in, refresh, logout and recovery.
- Test two accounts against allowed and forbidden messaging operations.
- Fix policy defects only after confirming actual schema and policies; add migration and regression tests.
- Verify auth hardening settings, including leaked-password protection.

### Gate C — First complete Fresh Mail journey
- Keep the current Vercel origin and use a configurable application origin.
- Prove the chosen provider in a sandbox before building UI promises around it.
- Implement authenticated mailbox API, message records, durable outbound queue, inbound webhook with signature/replay/idempotency checks, private attachments and honest delivery status.
- Acceptance: user A sends to an external mailbox; external recipient replies; reply appears in Fresh Mail; reload preserves thread; failures/bounces are visible; unauthorized users cannot read the thread or attachments.
- No public address is announced until sender/domain requirements and deliverability are verified. A custom domain purchase remains a later explicit decision.

### Gate D — Complete Fresh Flow core journeys
- Verify each of the six worlds independently.
- Complete Shorts playback and social interaction persistence.
- Complete News / Posts create/publish/distribute/reload flows.
- Build real Long Video and Podcast processing/delivery journeys.
- For AR/VR, test real supported capability and a graceful fallback.
- For Others, ship only individually supported formats.
- Close Creator Studio upload → processing → publish → Flow distribution and failure recovery.
- Keep Fresh Live, monetization, and other provider-dependent features visibly non-production until their own gates pass.

### Gate E — Unified experience
- Integrate mail, chat, groups, calls, files and notifications into one permission-aware inbox.
- Share contact, search, accessibility, navigation and AI primitives without flattening different service semantics.
- Preserve direct routes, deep links and return-to-home navigation.

### Gate F — Advanced capabilities and operations
- Voice/video, calendar/tasks, organization mail, AI assistance, integrations, live media, creator analytics, monetization, moderation, audit/incident tooling and scalability.
- Each capability remains registered even if sequenced later; defer explicitly, never silently drop it.

### Gate G — Release verification
- Run lint, typecheck, unit/integration tests, feature contract gates and production build.
- Verify the exact commit is deployed and the canonical `fresh-web-lite.vercel.app` routes respond correctly.
- Inspect runtime logs, provider events, database advisors and migration status.
- Test mobile touch, low bandwidth, reload/session recovery and critical flows.
- Record unresolved failures and rollback plan before marking a gate complete.

## 7. Immediate engineering priorities

1. Fresh ID E2E verification and auth hardening.
2. Messaging authorization review: verify thread ownership/participant checks and least-privilege grants.
3. Fresh Flow six-world route audit and critical user-journey test matrix.
4. Fresh Mail provider sandbox proof; no domain purchase required for architecture work, but real delivery acceptance may require verified sender/domain configuration.
5. Turn each finding into a scoped code change with automated regression tests; do not substitute more architecture documents for implementation.

## 8. Explicitly not done by this register

This document does not itself implement any runtime feature, apply a database migration, change authentication settings, configure a provider, send email, create a domain, or verify physical-device behavior. Those actions require separate changes and evidence.
