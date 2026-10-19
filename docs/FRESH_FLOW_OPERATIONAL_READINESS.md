# Fresh Flow Operational Readiness Register

**Purpose:** make Fresh Flow one dependable product, not a set of screens that imply unfinished capabilities are live.

**Status rule:** code presence is not production completion. A capability is **Complete** only after the user journey, authorization, persistence, failure/retry behavior, accessibility, automated checks, and live deployment have been verified. If a physical device or real provider is required, record that separately.

**Audit basis:** source and live-schema review on 2026-10-19. Production checks are listed separately; this is not a claim that every user journey or real device has been tested.

## Production verification note — 2026-10-19

- Vercel production deployment for commit `25f8d2f4f0d899f049f0227e6b20bdad48bbfff4` reached `READY`.
- The live Supabase publication includes `public.direct_messages`; the client also has a five-second refresh fallback when Realtime is unavailable.
- Read-only grant checks confirmed anonymous table-level SELECT/INSERT are revoked on `connection_requests`, `direct_messages`, `fresh_communication_threads`, and `fresh_communication_messages`. Authenticated column-level insert grants remain for the expected client fields.
- This does **not** establish two-account end-to-end delivery, private event authorization, or full Fresh Connect runtime correctness. Those checks remain open.
- Supabase Security Advisor still reports leaked-password protection disabled and three authenticated-callable SECURITY DEFINER functions. The account-creation RPC is intentionally privileged; helper-function exposure needs a separate review.

## Current status by capability

| Capability | Repository evidence | Honest status | Required completion evidence |
|---|---|---|---|
| Fresh Flow hub and six media destinations | Hub, route architecture, Shorts, News/Posts and media workspace components exist | **Implemented; end-to-end verification incomplete** | Verify every destination has real content/state, correct back navigation, loading/empty/error states and mobile behavior |
| Fresh Shorts playback and feed | Runtime, feed, pagination, safety, telemetry and interaction modules exist; production gate explicitly lists physical-device checks | **Partially verified** | Production smoke test plus real Android swipe/snap, active-only playback, background recovery, weak-network recovery, memory pressure and measured startup performance |
| News / Posts | Fresh Flow News/Posts component and shared feed/post interactions exist | **Implemented; source and journey verification incomplete** | Create/publish → feed → open post → react/comment/save/share → reload and confirm durable state |
| Long Videos | Media workspace and route exist | **Surface exists; production media pipeline not proven** | Real upload/ingest, processing states, playback delivery, resume, captions, errors and permissions |
| Podcasts | Media workspace and route exist | **Surface exists; production audio pipeline not proven** | Real show/episode source, play/pause, background audio, resume and playback errors |
| AR / VR | Destination and workspace exist | **Surface exists; real device/capability support not proven** | Verify actual supported experiences and gracefully handle unsupported devices |
| Others / additional formats | Extensible media workspace exists | **Extension surface only until a format is individually verified** | Each format must have a real source, playback/viewer, interactions and clear unsupported state |
| Profiles and post sharing | Profile overlay and post-specific share route are implemented | **Code implemented; latest live route still needs verification** | Open a shared post in a clean session/device, verify correct item, author, interactions and return to all posts |
| Connections and direct messages | Connection request services, accepted-connection checks, live direct-message subscription and polling fallback exist | **Realtime wired and publication enabled; two-account delivery still unverified** | Two-account test: request, accept, send, receive, read state, reload, denied access, network failure; confirm no cross-account leakage |
| Reactions, comments, saves and follows | Interaction services and persistence migrations exist | **Implemented in parts; cross-surface consistency must be tested** | Same state across feed/profile/detail, duplicate prevention, authorization and retry/error paths |
| Gifts / Fresh Coin | Gift service invokes Treasury transfer and records a Short receipt | **Payment path exists; not proof of production monetization** | Verify ledger invariants, idempotency, receipt reconciliation, fees, refunds/disputes and actual settlement provider; sandbox must be labelled |
| Creator publishing and media operations | Creator Studio and production panels exist | **Tooling exists; complete publish-to-distribution journey not proven** | Draft → upload → processing → publish/schedule → visible in Fresh Flow → analytics and failure recovery |
| Fresh Live | LiveWorkspace renders EcosystemPlaceholder | **NOT IMPLEMENTED as a live-streaming product** | Choose and configure a real streaming provider; create live sessions, publish/ingest, playback, live chat, moderation, end/replay, reconnect, metrics and tested access controls |
| Monetization / payouts | Treasury and payment-rail code exists; creator monetization panels exist | **Financial foundations exist; production payout readiness not proven** | Confirm supported real rails, settlement reconciliation, compliance, creator eligibility, fees, disputes, fraud controls and audit trail |
| Admin operations | Admin overview and user-management API exist with server-side role check | **Basic admin surface exists; full operations console incomplete** | Live service/deployment health, media/live status, failed jobs, reports/moderation, payment reconciliation, audit log and least-privilege actions |
| Security and privacy | Live table grants and messaging/connection policies were inspected and hardened on 2026-10-19; Supabase Security Advisor still reports Auth leaked-password protection disabled and three callable SECURITY DEFINER functions | **Messaging grants verified; remaining Auth/function warnings need review** | Verify all deployed migrations, RLS/policies, auth settings, secret boundaries, admin authorization, private realtime authorization and data-retention behavior |
| Production release | GitHub CI gates and Vercel deployments exist | **CI is not the same as end-to-end production readiness** | Verify exact commit is deployed, HTTP smoke tests, server logs, migrations, critical journeys and rollback readiness |

## Recommended execution order

### Gate 0 — Freeze scope and establish truth
- Use this register as the single readiness source.
- For every user-visible action, identify its route, service/API, persistence, permissions, success state, error state and test.
- Keep unfinished capabilities clearly marked as preview/coming soon or hide them from the default user journey. Do not display fake live counts, playback, payments or delivery success.

### Gate 1 — Finish Fresh Flow core
1. Shorts: playback, pagination, interactions, share/deep link, loading/error/empty states.
2. News/Posts: create, publish, view, react, comment, save, share and reload.
3. Long video and podcasts: real content source and dependable player lifecycle.
4. Profiles/follows and content ownership.
5. Mobile accessibility, slow-network behavior, and production smoke tests.

### Gate 2 — Finish communication
1. Two-account connection request and acceptance.
2. Persisted direct messages with send/read/error states.
3. Realtime delivery only after private channel authorization is verified.
4. Block/report, notification delivery, privacy settings and abuse handling.
5. Test permissions and data isolation with at least two independent accounts.

### Gate 3 — Monetization and live
1. Decide the production live provider and deployment configuration before building a false browser-only live demo.
2. Implement session lifecycle, ingest/playback, chat/moderation and recovery.
3. Tie gifts to the authoritative ledger with idempotent receipts and reconciliation.
4. Enable creator earnings/payouts only for verified, supported rails; label sandbox paths.
5. Test end-to-end with test accounts and provider sandbox before limited production rollout.

### Gate 4 — Admin operations and launch
1. Add a capability/readiness dashboard based on real health signals, not hard-coded status.
2. Show deploy SHA, service health, failed jobs, reports, live sessions, payment reconciliation and audit events.
3. Restrict admin data/actions server-side and log sensitive changes.
4. Run release gates, production smoke tests, mobile verification and rollback rehearsal.

## Definition of done

A capability is not marked **Complete** until all relevant items are evidenced:

- [ ] User can reach it through the normal UI.
- [ ] Correct identity and permissions are enforced server-side.
- [ ] The primary action reaches a real service/provider.
- [ ] Durable data persists and reloads correctly where applicable.
- [ ] Loading, empty, offline, failure and retry states are honest and usable.
- [ ] It works on a narrow Android viewport with accessible labels and touch targets.
- [ ] Automated checks pass.
- [ ] The exact tested commit is deployed and smoke-tested.
- [ ] Required real-device/provider/security checks are recorded.
- [ ] Admin has appropriate operational visibility without exposing private user content unnecessarily.

## Immediate first implementation target

**Fresh Flow core before expansion:** test and close the complete News/Posts journey, including the recently added post-specific share route, then close Shorts playback/interactions. In parallel, treat Fresh Live as explicitly incomplete until a real provider and session lifecycle are integrated. Do not claim communication is realtime until two-account delivery and channel authorization are verified.
