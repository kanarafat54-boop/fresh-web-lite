# Fresh Identity + Fresh Mail — Phase 0 Audit

**Audit date:** 2026-10-14  
**Repository:** `kanarafat54-boop/fresh-web-lite`  
**Production code baseline:** `main` at `acf9fe9018f100995240f1619b208626cf9e4acd`  
**Identity signup candidate:** PR #51, head `875bb58a697fd97db97c30396aac4b3a45b9db60`  
**Product blueprint:** PR #52, head `0be4f5b2b44dd83a04873b5593080c3856adc2c0`

## Executive decision

**Do not provision public Fresh Mail addresses or represent the service as production-ready yet.** The current application has an identity foundation and internal messaging tables, but the audit has not found a mail-provider integration, a mail API route, verified domain ownership for a mail domain, or evidence of real external send-and-reply delivery.

The lowest-risk path is to finish identity verification, resolve the highest-priority data-access findings, select a provider only after a sandbox proof, then build mailbox storage and the UI around a verified provider adapter. No runtime code, DNS, provider configuration, or production schema was changed as part of this audit.

## 1. Verified repository and deployment baseline

- The project is a React + Vite + React Router application using `@supabase/supabase-js`; `vercel.json` routes `/api/*` to serverless API files and uses `/index.html` as the SPA fallback.
- The current `api/` tree includes `admin`, `ai`, `finance`, `research`, and `shorts`. No mail/email API directory was present in the inspected tree.
- Vercel's latest inspected production deployment is READY and points to `main` at `acf9fe9018f100995240f1619b208626cf9e4acd`. The newer signup work is on an unmerged feature branch and is not part of this production commit.
- The Vercel project lists `fresh-web-lite.vercel.app` as its production domain. This is a platform subdomain, not evidence that FWL controls mail DNS for that domain.
- Environment variable names were inspected without decrypting values. No mail-provider credential/configuration variables (for example, Resend, Mailgun, or SES settings) were present in the inspected Vercel environment inventory. This does not rule out an external provider account that has not been connected to the app.

## 2. Fresh Identity status

### Present

- Supabase Auth integration and the Fresh ID context already exist.
- The live `public.users` table has owner-scoped SELECT/INSERT/UPDATE policies for authenticated users.
- The live `public.fresh_id_private_profiles` table exists with RLS enabled and owner-scoped SELECT/INSERT/UPDATE policies.
- The signup migration `20261014132351_fresh_id_signup_profile_fields` is recorded in live migration history.
- PR #51 adds confirm-password validation, date of birth, optional country/gender, consent metadata, server-side age/audit enforcement, and case-insensitive username uniqueness.

### Not yet proven

- Real registration through the deployed app, including email confirmation and subsequent session restoration.
- Duplicate username rejection through the complete UI path.
- Password reset and account recovery in a real session.
- Correct navigation from confirmed sign-up/sign-in to the intended landing page.
- That the signup feature works end to end after merge; PR #51 is still a draft.

**Gate:** keep PR #51 unmerged until a dedicated test mailbox can receive the confirmation email and the full journey can be completed. Do not use a real user's account as a test fixture.

## 3. Live database findings relevant to Fresh Mail

The live database contains these distinct systems:

- `direct_messages`: internal user-to-user messages with sender/recipient IDs.
- `fresh_communication_threads`: internal communication threads with an `owner_id`.
- `fresh_communication_messages`: messages linked to an internal thread by `thread_id` and attributed to `sender_id`.
- `fresh_id_private_profiles`: private Fresh ID signup/profile metadata.

These tables are **not** an external email service. There are no audited mailboxes, external envelope addresses, provider message IDs, delivery/bounce records, inbound webhook receipts, or mail attachment lifecycle in the inspected schema. No mail-specific storage bucket exists in the inspected Storage bucket list.

### Priority security and integrity review

1. **Internal communication grants are broader than needed.** The live ACLs give `anon` broad table privileges on `direct_messages`, `fresh_communication_threads`, and `fresh_communication_messages`, despite RLS being enabled. Current RLS policies block anonymous row access in the inspected cases, so this observation alone is not proof of an anonymous data leak. Review effective grants and reduce them through a reviewed migration before relying on these tables for mail.
2. **Message/thread ownership needs a negative-test review.** The `fresh_communication_messages` policy checks that `sender_id = auth.uid()`, while thread ownership is checked separately on `fresh_communication_threads`. The message policy does not itself verify that the sender owns or participates in the referenced thread. A signed-in user who knows another thread UUID may be able to attach a message to that thread. Test this explicitly and correct the relationship policy before reusing this model.
3. **Leaked-password protection is disabled.** Supabase's Security Advisor reported `auth_leaked_password_protection` as WARN. Enable it in Auth settings after checking the project's supported configuration and validating sign-up behavior.
4. **Ten tables are flagged for RLS enabled with no policies.** These include Fresh AI/internal intelligence tables and ledger tables. No policy means client roles generally cannot access those rows, which may be intentional for server-only tables. Confirm the intended service-role/server access model table by table; do not add permissive policies merely to silence the advisory.
5. **Performance advisor findings exist.** The live advisor reported 89 RLS initialization-plan warnings and 19 multiple-permissive-policy findings, plus unused-index notices. Prioritize policies on hot user-facing paths and measure before changing indexes; do not perform broad cleanup during the mail launch work.

References:
- [Supabase leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Supabase database security and RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 4. Provider and domain decision — shortlist only

No provider has been selected or configured. A send-only API is insufficient; the candidate must support inbound delivery to a controlled domain, secure webhooks or API retrieval, outbound delivery, and enough retention/API access to let FWL build a durable private mailbox.

| Candidate | Evidence reviewed | Fit / unresolved point |
|---|---|---|
| Resend | [Inbound receiving](https://resend.com/features/inbound) and [pricing](https://resend.com/pricing) | Strong developer-oriented candidate: inbound webhook/API and attachment retrieval are documented. Confirm whether the required inbound features and test domain are available on the intended low-cost plan; FWL still must store mailbox data durably and implement user access controls. Published pricing currently lists a Free tier with 3,000 emails/month and 100/day, and Pro at $20/month for 50,000 emails/month; verify exact inbound quota/eligibility before choosing. |
| Mailgun | [Inbound routes](https://documentation.mailgun.com/docs/mailgun/user-manual/receive-forward-store/routes) and [pricing](https://www.mailgun.com/pricing/) | Supports receiving/routing and parsing inbound mail. Published plans currently show Free with one inbound route and Basic from $15/month with five routes. Confirm regional availability, actual retention, and total cost for the expected volume. |
| Amazon SES | [Receiving guide](https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html) and [pricing](https://aws.amazon.com/ses/pricing/) | Low unit-cost candidate with inbound rules and storage/processing integrations, but requires more AWS setup and operational work. Pricing distinguishes inbound/outbound and optional Mail Manager features; calculate the actual architecture rather than comparing headline send rates only. |
| Postmark | [Pricing](https://postmarkapp.com/pricing) | Has inbound processing, but should be evaluated as a parsing/processing component rather than assumed to be a complete mailbox. Current pricing lists a Developer tier and paid plans; verify volume and retention needs. |

**Provisional direction:** run a small provider proof of concept before committing. Resend is the first candidate to test because its documented inbound API/webhook model fits a Vercel server route, but it is not yet the approved production provider. Do not purchase a domain or provider plan until the exact recurring cost and DNS ownership path are agreed.

### Domain requirement

- Do not use `@fresh-web-lite.vercel.app` as a promised mailbox domain.
- Acquire or use a domain FWL can control and renew, then configure the provider's required MX, SPF, DKIM, and DMARC records.
- A user's Fresh username and an email address are separate identities. Only show an address as available after the provider/domain and mailbox provisioning workflow confirms it.

## 5. Recommended implementation order

1. **Identity acceptance tests:** complete signup, confirmation, session restore, duplicate username, password mismatch, reset, logout, and landing-page navigation on a preview deployment.
2. **Identity configuration:** enable leaked-password protection; verify allowed redirect URLs and email confirmation behavior. Do not expose secret keys in client bundles or logs.
3. **Messaging access review:** design negative tests for anonymous access, cross-thread insertion, cross-account reads/updates/deletes, and verify grants/RLS as a pair. Propose a migration only after confirming intended app behavior.
4. **Mail provider proof:** controlled test domain, provider verification, authenticated outbound email, inbound webhook signature verification, attachment handling, duplicate/replay event tests, and a reply from an independent external mailbox.
5. **Private mailbox data model:** only after provider proof; define mailbox/address reservation, provisioning state, envelope/recipient metadata, provider IDs, normalized message/body storage, attachment metadata and scan state, delivery events, idempotency, quotas, retention/export/deletion.
6. **Mail API and UI:** authenticated server routes; inbox/compose/detail/reply/sent/drafts; honest pending/sent/failed/bounced states; owner-isolation tests; accessible small-screen layout.
7. **Controlled launch:** low quotas and opt-in cohort, delivery/abuse/cost monitoring, backups and recovery drill.

## 6. Minimum acceptance matrix

| Test | Required result |
|---|---|
| Signup + confirmation | Dedicated test user confirms email, returns to FWL, session/profile restore succeeds |
| Duplicate username | Concurrent and case-variant claims cannot create duplicates |
| Private profile isolation | User A cannot read or update User B's DOB/consent record |
| Internal message isolation | Anonymous and cross-account/thread operations fail; participants can perform only intended actions |
| Provider webhook | Invalid signature rejected; duplicate event is idempotent |
| External send + reply | Independent external account receives the message and replies; reply persists after reload |
| Attachment isolation | Only authorized mailbox owner can retrieve an attachment |
| Failure handling | Bounce, invalid recipient, timeout, retry, and provider outage produce truthful recoverable states |
| Privacy | Mail content does not appear in ordinary logs; export/deletion and retention behavior are documented |
| Deployment | Preview/production SHA, build status, smoke-test result, and rollback target recorded |

## 7. Read-only domain availability and renewal check

A read-only registrar lookup on 2026-10-14 returned these results. Availability and prices can change; this check did not reserve or purchase anything.

| Domain candidate | Lookup result | First year | Renewal shown | Assessment |
|---|---:|---:|---:|---|
| `freshwebmail.com` | Available | $11.25 | $11.25/year | Best current cost predictability of this shortlist; still a long brand name |
| `freshflowmail.com` | Available | $11.25 | $11.25/year | Same quoted price; aligns with Fresh Flow branding |
| `freshmail.email` | Available | $9.99 | $28.13/year | Lower first-year price but substantially higher renewal |
| `freshweb.email` | Available | $9.99 | $28.13/year | Same renewal concern |
| `freshmail.app` | Unavailable | — | — | Not an option from this lookup |
| `freshmail.ug` | Unavailable | — | — | Not an option from this lookup |

**Recommendation for approval, not purchase:** shortlist `freshwebmail.com` and `freshflowmail.com` for brand/domain fit and stable quoted renewal. Do not buy either until you approve the exact name and recurring cost. The domain must then be connected to the chosen inbound/outbound provider and authenticated with its required DNS records.

## 8. Phase 0 exit status

**Not complete yet.** This report captures the verified baseline and blockers. Remaining items are the real signup journey, a complete review of server routes and storage policies, identity recovery/redirect verification, and a tested provider/domain cost decision. No production mail capability should be claimed until the external send-and-reply acceptance test passes.


## Integration fit addendum — where this belongs

The repository already has a broader communication architecture and completion register. Fresh Identity + Fresh Mail should be implemented within that plan, not as a disconnected fourth communication product or as a new generic message table.

### Product placement

- **Fresh ID is the identity foundation**, not a standalone mailbox. Reuse Supabase Auth and the existing Fresh ID context for account/session identity; keep username, verified login email, private signup attributes, and any future Fresh Mail address as distinct concepts.
- **Fresh Communication is the user-facing home for Fresh Mail.** PR #54 proposes one Communication shell and unified inbox across internal chat, external email, notifications, files, and optional AI assistance. Fresh Mail should appear as a channel/view inside that surface rather than compete with a separate top-level communication destination.
- **Fresh Flow is a downstream work destination, not a mail transport.** Approved messages may later create tasks, reminders, saved references, or creator/work items, but those are explicit integrations and must not copy private message bodies into unrelated stores by default.
- **Fresh AI is an optional assistant layer.** It can summarize, classify, translate, draft, or extract tasks from a message only within the user's consent and permission scope. It must not silently send, forward, delete, or share private content.
- **Admin is an operations plane.** Admin visibility should cover provider health, queue age, delivery/bounce/complaint counts, quota/abuse events, and redacted correlation IDs. Routine administrators should not have default access to message bodies or attachments.

### Architecture boundaries

1. **Keep internal chat and external email separate.** The existing `direct_messages`, `fresh_communication_threads`, and `fresh_communication_messages` tables are not mailboxes. Do not retrofit SMTP/API email into them. External email needs dedicated mailbox/message/recipient/attachment/delivery-event records, provider IDs, inbound webhook receipts, idempotency, and durable outbound jobs.
2. **Reuse the existing application seams.** The app is React + Vite; `FeatureRegistry` is the navigation/feature registration seam, `CommunicationWorkspace` is the existing communication entry, and Vercel `/api/*` routes are the server boundary. Before adding a mail UI or route, inspect the current Communication workspace and existing server/API conventions; do not create a second navigation system.
3. **Use a provider adapter behind server routes.** Browser code must never receive mail-provider credentials. All send, inbound webhook, mailbox provisioning, attachment retrieval, and provider-event handling must validate identity/ownership server-side and return truthful queued/sent/delivered/failed/bounced states.
4. **Store mail in a purpose-built private data model.** Choose a private schema or explicitly secured exposed schema after reviewing grants, RLS, storage policies, and retention. A combined inbox may index source metadata, but the index is never the authority for access.
5. **Keep domain ownership separate from app hosting.** `fresh-web-lite.vercel.app` is the initial web origin, not an owned mail domain. For the first proof, use a provider-supported sandbox/test recipient and prove external send/receive/reply. Defer public branded mailbox provisioning and domain purchase until a provider, full costs, data handling, and DNS ownership are approved. Do not display `@fresh-web-lite.vercel.app` as a working mailbox.
6. **Make integrations optional and revocable.** Email-to-task/calendar/search integrations need explicit user choice, scoped permissions, visible source links, and revocation. Do not grant broad cross-table access to create a unified inbox.

### Existing work to coordinate — avoid duplicate implementation

- [PR #51 — Fresh ID signup validation/private profile](https://github.com/kanarafat54-boop/fresh-web-lite/pull/51): draft; needs real dedicated-account confirmation, duplicate-username, recovery/session, and post-login navigation E2E before merge.
- [PR #52 — Fresh Identity + Fresh Mail blueprint](https://github.com/kanarafat54-boop/fresh-web-lite/pull/52): planning baseline; keep domain/provider choices conditional on proof and approval.
- [PR #54 — Unified Fresh Communication architecture](https://github.com/kanarafat54-boop/fresh-web-lite/pull/54) and [PR #55 — Communication + Fresh Flow completion register](https://github.com/kanarafat54-boop/fresh-web-lite/pull/55): use these as the product placement and acceptance source of truth; align status vocabulary rather than creating another feature checklist.
- [PR #56 — Phase 0 messaging access hardening](https://github.com/kanarafat54-boop/fresh-web-lite/pull/56): draft security work. Its source-contract/pgTAP additions are useful, but they do not replace staging application, two-account negative tests, live grant/policy re-query, or post-migration advisor review. Do not apply its migrations to production merely because preview checks are green.

### Updated dependency order

1. **Identity journey:** review PR #51 against the actual mainline, verify email confirmation/session restore/recovery/landing navigation with a dedicated test mailbox, and resolve Auth configuration warnings.
2. **Messaging security:** review PR #56 migration SQL and tests; pass CI, staging pgTAP, two-account authorization tests, and live post-apply checks before promoting.
3. **Provider proof:** compare receiving-capable provider options using total cost, inbound support, retention, attachment behavior, webhook security, portability, and Uganda-relevant payment/account constraints. Use sandbox/test mode first; no domain purchase or paid provider activation without approval.
4. **Mailbox backend:** create a provider-neutral adapter and dedicated mail records only after the proof; add ownership/RLS/grants, quotas, attachment limits, idempotency, bounce/complaint handling, retention, export, and deletion.
5. **Communication UI:** add Mail as a channel inside the existing Communication shell, with mobile-readable inbox/compose/detail states, accessible controls, pagination, empty/loading/offline/error/retry states, and real delivery status.
6. **Controlled integrations and launch:** connect AI/Flow only behind explicit permissions; run external send → inbound receive → inbox open → reply → failure/retry with evidence, then decide whether a branded domain is justified.

**Phase 0 remains incomplete.** PRs, documents, static checks, and a ready preview are not production verification. No production mail service or public Fresh Mail address should be claimed until the end-to-end acceptance journey is proven.
