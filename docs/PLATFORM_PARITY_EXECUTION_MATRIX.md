# Fresh Platform Parity — Execution Matrix

**Relationship to existing documentation:** `docs/FRESH_FLOW_OPERATIONAL_READINESS.md` remains the canonical release/readiness register. This matrix extends it with cross-platform parity categories; it does not replace existing architecture or readiness documents.

## Engineering rule

A route, card, mock, registry entry, or design is not proof that a capability is implemented. Mark it verified only after the real user action succeeds, persists where appropriate, handles failure, works on small screens, and passes authorization checks.

## Baseline audit snapshot — 2026-10-19

The connected Fresh Web Lite Supabase project has live foundations for profiles, posts, post likes/comments, follows, shorts, saved content, connection requests, direct messages, notifications, universal interactions, Fresh AI conversations, Fresh Intelligence, treasury and workspace accounts. This does not prove every user-facing flow is complete.

Observed gaps and cautions:
- The README describes a generated/demo content experience; generated content must not be confused with a fully operating social network.
- The Supabase Realtime publication did not include the checked social tables, including direct_messages. This tranche adds direct-message publication plus a polling fallback.
- Direct messages currently require accepted connections. Keep that as a clear initial privacy rule, then add configurable inbox and messaging privacy controls.
- A database table or migration alone does not prove the related screen is wired end-to-end.
- Bitcoin must be treated as a distinct asset/network with explicit addresses, fees, confirmations, custody and risk controls. A generic crypto label or Fresh Coin balance is not Bitcoin support.

## Parity workstreams and acceptance criteria

| Workstream | Familiar baseline users expect | Acceptance criteria before marking verified |
|---|---|---|
| Fresh ID | Sign up, sign in/out, password recovery, sessions, profile, privacy and security | Real auth provider; recovery works; session survives refresh; accessible errors; no client-side privilege claims |
| Social graph | Follow/unfollow, connection requests, block/report, followers/following | Persistent state; idempotent actions; pagination; privacy settings and server-enforced authorization |
| Public posts | Text, images, video, links, editing/deletion, replies, reactions, reposts, bookmarks | Upload/storage path; persisted content; correct counts; retry/error states; moderation and ownership checks |
| Fresh Flow | For You, Following, topic/search discovery, media controls, stories/live where supported | Query-backed feeds; no placeholder actions; loading/empty/error states; accessible controls on narrow screens |
| Messaging | Conversation list, unread counts, read receipts, live updates, attachments, search, notification controls | Two-account tests; only authorized participants can read/send; realtime plus degraded-network fallback; deduplicated events |
| Groups and channels | Create/join, member roles, moderation, announcements, search | Membership policy enforced server-side; clear public/private/invite-only semantics |
| Search and knowledge | Search people, posts, media, topics and external knowledge; filters and useful ranking | Real records; pagination; permission filtering; source/recency indicators where relevant |
| Notifications | Follow, request, message and content notifications; read/unread and preferences | Event-backed records; owner-only reads; no duplicate notifications; deep links open the correct item |
| Creator tools | Drafts, media upload, editing, publishing, analytics and monetization | Drafts persist; published content is visible in feeds; media failures recover; payouts require authorization |
| Wallet and Bitcoin | Balances, history, deposit/withdrawal, receive/send, asset/network selection | Never present sandbox rails as real settlement; Bitcoin only after network integration, address validation, fees and confirmations are implemented |
| Search/productivity | Universal search, email/productivity hooks, documents and knowledge retrieval | Clear capability boundaries; connected-service permissions; real outputs; transparent failures |
| Trust and safety | Block/report, moderation, privacy controls, anti-spam and account recovery | Server-side enforcement, auditability, rate limits and accessible appeal/error paths |
| Mobile/accessibility | Responsive layout, readable type, screen-reader support, low-bandwidth resilience | Test at small Android widths; no clipped controls; visible focus; retry/empty/loading states; avoid heavy initial downloads |

## Fresh ID parity slice — implemented in this branch, pending CI/E2E

- Signup now collects full name, username, email, password confirmation, date of birth, optional country/gender, consent, and a selected starting experience (personal, creator, business, developer, or organization).
- Date-only age validation uses UTC calendar dates so users in Uganda and other UTC-positive time zones are not incorrectly rejected at midnight boundaries.
- Private signup attributes are persisted to the owner-scoped `fresh_id_private_profiles` table, with temporary Auth metadata cleared only after the private row exists.
- Password recovery now requires a matching new-password confirmation and a 12-character minimum.
- Account type is explicitly a starting-experience preference, not an authorization role or automatic workspace creation. Real creator/business/developer/organization workspaces are separately created through authenticated Fresh ID workspace controls.
- WhatsApp, Telegram, and TikTok login buttons are disabled and labelled as not connected; they must not appear to work before their official identity integrations are configured.
- Automated gates cover password confirmation, consent, recovery validation, UTC date handling, private-profile metadata cleanup, and existing Fresh ID security contracts.

Still required before marking Fresh ID **verified**: run CI on this branch; complete a real test-mailbox signup and confirmation; test duplicate username, password mismatch, recovery link, password reset, session restoration, selected workspace-mode persistence, and Home landing on the preview; verify private profile data remains owner-only. Do not use a real user's account as a test fixture.

## Delivery sequence

1. **Reliability and identity:** Fresh ID, profile/privacy settings, RLS, storage, errors and mobile baseline.
2. **Social essentials:** publish/read/update/delete content; reactions, comments, follows, saves, reports and notifications.
3. **Communication essentials:** conversation list, real-time delivery, read/unread, attachments, search, block/report and notification preferences.
4. **Discovery essentials:** search people/posts/media/topics and query-backed For You/Following feeds.
5. **Creator and commerce:** drafts, media pipelines, analytics, listings and authorized payments.
6. **Bitcoin and external integrations:** proceed only after real providers, custody boundaries, applicable compliance obligations and test environments are confirmed.
7. **Differentiation:** embed Fresh AI and automation in verified workflows; do not use them to disguise missing fundamentals.

## Status vocabulary

- **discovered** — identified but not assessed.
- **planned** — defined but not wired.
- **wired** — connected in code, not yet verified end-to-end.
- **verified** — tested with real data and authorization checks.
- **blocked** — a specific dependency or access issue prevents verification.

This is a working backlog, not a claim that every listed capability is shipped.
