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


## 9. Fresh Live — flagship ambition and competitive acceptance

**Product ambition:** Fresh Live should aim to outperform the experience of comparable products such as TikTok LIVE, YouTube Live and BIGO LIVE across defined user outcomes. “30×” is a strategic ambition, not a current performance claim. We must measure each dimension, publish no superiority claim without evidence, and never use manipulative engagement or unsafe monetization to chase growth.

Competitive reference points include real-time creator/audience interaction and LIVE gifts/effects/multi-guest tools, YouTube live chat/polls and replay, and BIGO's multi-guest rooms, audio rooms and creator battles. These are baseline expectations to study—not features to copy blindly. Sources: TikTok LIVE support (https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/what-is-tiktok-live), YouTube live chat help (https://support.google.com/youtube/answer/15268877), BIGO LIVE feature guide (https://www.bigo.tv/news-events/use-bigo-live).

### FLOW-27 — Fresh Voice Rooms / social audio
- Audio-only public, private and community rooms; host/co-host/speaker/listener roles; request-to-speak queue; mute/remove/block/report; room rules and moderation; reconnect; background audio where the platform permits; captions/transcription where feasible; optional recording only with explicit disclosure and consent.
- Acceptance: host creates a room, invites a speaker, accepts/declines a listener request, moderator removes an abusive participant, reconnect preserves room state, and unauthorized users cannot control the room.
- Status: Not implemented as a complete production service.

### FLOW-28 — Stories & Moments
- Temporary photo/text/video posts with explicit expiry, audience selector, privacy and reply controls, mentions, stickers/polls/questions where supported, optional highlights and safe sharing into Fresh Communication.
- Acceptance: publish → audience visibility → view/reply/react → expiry → verify no longer appears in normal surfaces; privacy and block rules apply across direct links and search.
- Status: Not implemented as a complete production journey.

### FLOW-29 — Music & Audio catalog
- Artist/creator pages, track and episode metadata, playlists/queues, search, audio-first playback, background/resume where supported, captions/lyrics only when rights allow, and licensed/original audio labels.
- Acceptance: every playable asset has a rights/source record; unsupported or unavailable content explains why; playback state survives navigation; rights revocation can disable affected distribution.
- Dependency: licensing and territory rights; do not assume a popular song can be streamed or reused.
- Status: Not implemented as a licensed catalog.

### FLOW-30 — Gaming & Interactive Media
- Game streams, approved screen capture/broadcast, community tournaments, quizzes, live voting, challenges, leaderboards and interactive overlays; integrations must be scoped and revocable.
- Acceptance: creator verifies broadcast permission, interactions are rate-limited and auditable, scores have a defined source, cheating/report flows exist, and unsupported devices have an honest fallback.
- Status: Not implemented as a complete production capability.

### FLOW-31 — Fresh Market & Live Shopping
- Product demos during a live, seller/store profiles, product cards, catalog/stock links, clearly disclosed sponsored/affiliate content, offer expiry, order handoff and buyer support.
- Acceptance: product/price/stock source is current; seller identity and offer terms are visible; checkout only activates when a real compliant payment/order provider is configured; receipts, refunds and disputes have auditable states.
- Dependencies: payment provider, consumer protection, tax/commerce obligations and seller verification. Never simulate a successful payment or order.
- Status: Deferred pending compliance/provider decision.

### FLOW-32 — Events & Challenges
- Scheduled lives, registration/RSVP, reminders, time-zone-safe start times, premieres, workshops/webinars, community challenges, team entries, replay links and accessible event information.
- Acceptance: create → discover → RSVP → reminder → join → complete/cancel → replay or outcome; cancellation and time-zone changes are communicated correctly.
- Status: Not implemented as a complete journey.

### FLOW-33 — Camera, Effects & Creation Studio
- Mobile camera entry where supported, drafts, trim/crop, covers, captions, audio levels, safe effects, templates, clip extraction from eligible long videos/lives/podcasts, and permission-based remix/duet/side-by-side creation.
- Acceptance: draft survives app navigation, upload failure can resume, accessibility/captions are supported, effects do not block basic capture on low-memory devices, and source/creator permissions are enforced.
- Status: Partial concepts only; device-level proof required.

### FLOW-34 — Live modes, co-streaming and replay lifecycle
- Distinct modes: (1) Live Broadcast, (2) Live Audio Room, (3) Live Interactive Session. Shared scheduling, invites, notification, room policy, moderation, stream health, replay policy and analytics; mode-specific media transport and controls.
- Co-host/guest seats, request/accept/revoke consent, moderator roles, audience Q&A/polls/reactions, clips, scheduled countdowns, replay choice and creator dashboard. Screen share and external encoder support are separate capabilities and must be marked unsupported until tested.
- Acceptance: scheduled and immediate start; permission prompt and device check; healthy ingest/playback; chat/polls respect permissions; host can mute/remove/end; reconnect recovers or reports failure; replay follows creator and participant consent; metrics reconcile with server-side events.
- Status: Not implemented; real-time media provider and cost profile not selected.

## 10. The Fresh Live “30×” scorecard

Use this as an engineering scorecard, not advertising copy. Capture a baseline from representative competing experiences and Fresh Live prototypes, define the same test conditions, then measure improvements per release.

1. **Time to first live:** setup clarity, device check and time from intent to a healthy stream.
2. **Low-bandwidth resilience:** startup success, rebuffering, audio continuity, adaptive quality, reconnect success and data consumption on constrained mobile networks.
3. **Affordable-device performance:** memory/CPU, battery/heat, crash rate, camera availability and usability on entry-level Android hardware.
4. **Interaction quality:** chat/poll latency, guest join success, moderation action latency and accessibility of controls.
5. **Creator reliability:** stream health visibility, recoverable errors, replay correctness, clip creation and transparent analytics.
6. **Discovery quality:** relevance, diversity, language/local relevance, new-creator exposure and user control over recommendations.
7. **Creator economics:** transparent fees, payout eligibility, settlement traceability, dispute/refund handling and fraud prevention—only after provider and legal readiness.
8. **Safety and trust:** report/block effectiveness, time to action, spam/raid controls, impersonation prevention, age-appropriate access and appeal process.
9. **Accessibility:** captions, readable layout, screen-reader support, reduced motion, touch targets, keyboard access and audio-only participation.
10. **Creator-to-community continuity:** scheduling, reminders, followers, clips, replay, events and conversation without forcing users to rebuild audiences across disconnected products.
11. **Privacy and control:** clear audience/recording consent, minimal data collection, granular room permissions and reliable deletion/retention behavior.
12. **Operational excellence:** incident detection, rollback, provider health, observability, cost per viewer-hour and honest service status.

For each metric, record definition, baseline, sample size, device/network conditions, target, observed result, date and commit. Never multiply incomparable scores into a made-up “30×” figure. A feature is not a win if it improves watch time by undermining user wellbeing, safety, privacy or creator fairness.

## 11. Fresh Live release gates and dependencies

- **Live Gate 1 — design and provider decision:** define broadcast architecture, regions, latency target, ingest/playback support, mobile web limitations, concurrent viewer model, storage/egress costs and fallback strategy. No provider is selected until pricing and budget are reviewed.
- **Live Gate 2 — secure private test:** authenticated creator starts a test stream; invited viewer watches; chat is authorized; stream can be ended; failures are visible; no monetization.
- **Live Gate 3 — safety and reliability:** moderation, reports, rate limits, age/access rules, consent for guests/recording, reconnect, load tests and incident controls.
- **Live Gate 4 — creator beta:** scheduling, notifications, analytics, replay/clip workflows, accessible UI and low-end Android/network tests.
- **Live Gate 5 — monetization or commerce:** only after eligibility, payment provider, fee disclosures, ledger invariants, refunds/disputes, fraud controls and jurisdictional requirements pass.
- **Live Gate 6 — production scale:** load and cost budgets, SLOs, abuse drills, rollback, support playbooks, regional availability and measured performance versus baselines.

Live video/audio infrastructure, music rights, creator payouts and commerce can introduce material recurring costs. Keep early testing small and budget-controlled; do not start a paid service, purchase a domain, or promise payouts without explicit approval.

## 12. Fresh Flow expansion status

The original FLOW-01 through FLOW-26 register remains intact. FLOW-27 through FLOW-34 extend it; they do not replace the original six Flow destinations or imply that the new capabilities exist today. Current truthful state: **scope registered; runtime implementation and production verification remain outstanding** for the newly added capabilities.
