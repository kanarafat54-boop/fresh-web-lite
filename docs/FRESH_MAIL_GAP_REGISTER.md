# Fresh Mail — Gap Register and Implementation Sequence

**Status date:** 2026-10-14  
**Scope:** Fresh ID integration, existing Fresh Communication workspace, provider-backed external email, and production-readiness gates.  
**Purpose:** Prevent a UI-only mail demo from being mistaken for a working email service.

## Verified fit in the current application

- The application is a Vite + React app built with `npm run build`; Vercel serves the app and routes `/api/*` to server endpoints.
- `src/app/registry/FeatureRegistry.ts` registers `communication` at `/communication`, loading `src/features/workspaces/CommunicationWorkspace.tsx`.
- `CommunicationWorkspace.tsx` currently implements Fresh Connect: discoverable profiles, connection requests, and accepted-connection direct messages.
- `src/features/workspaces/messagingService.ts` reads/writes `public.direct_messages`. That table is for in-app messaging and must not be reused as external email storage.
- Fresh ID is supplied through `src/features/fresh-id/context/FreshIdContext.tsx` and the shared Supabase client.
- No confirmed, complete provider-backed Fresh Mail implementation was found in the inspected integration points. A registered Communication workspace is not evidence of external mail support.
- The current deployment host `fresh-web-lite.vercel.app` is not a domain the project controls for email DNS. It cannot be treated as an owned `@fresh-web-lite.vercel.app` mailbox domain.

## What is missing today

| Capability | Current finding | Required completion evidence |
|---|---|---|
| Branded domain | No verified mail domain/configuration in this implementation | Domain ownership confirmed; DNS records verified with provider |
| Provider account | No confirmed provider credentials/configuration | Server-only secrets set in deployment environment; send and inbound proof |
| Outbound delivery | No verified Fresh Mail send path | Authenticated API sends a real email; provider message ID and delivery/bounce status recorded |
| Inbound delivery | No verified inbound route | External reply reaches provider webhook, is signature-verified, and appears in the correct mailbox |
| Mailbox provisioning | No dedicated mailbox model confirmed | Atomic address claim/provisioning, uniqueness, lifecycle and abuse controls |
| Email persistence | Existing direct messages are in-app messages, not email | Dedicated mailbox/message/event tables with owner isolation and retention |
| Attachments | No verified email attachment pipeline | Size/type limits, private object storage, signed download, malware scanning strategy, quotas |
| Mail client | No verified inbox/compose/reply experience | Mobile-first inbox, message detail, compose/reply/forward, sent/drafts/archive/spam/trash/search |
| Identity lifecycle | Fresh ID exists; mail lifecycle integration is not proven | Create/disable/delete mailbox, address recovery, account deletion/export semantics |
| Delivery feedback | No verified bounce/complaint processing | Signed, idempotent webhook handling and suppression list |
| Safety and abuse | No mail-specific launch gate verified | Rate limits, verification, anti-spam policy, reporting, audit logs, abuse response |
| AI integration | No scoped mail permission workflow verified | Read/draft scopes, user approval before send/forward/delete/share, audit trail |
| Operations | No mail-specific monitoring/rollback proven | Metrics, alerting, provider quota visibility, backups/restore and incident runbook |
| Cost/limits | Provider and domain cost not confirmed | Written budget at 100, 1,000 and 10,000 mailboxes; published limits surfaced in UI |

## Architecture that fits Fresh Web Lite

1. **Fresh ID remains the identity source.** Every mailbox operation derives the user from the verified server-side session; never trust a browser-supplied owner ID.
2. **Fresh Mail is a distinct channel inside Communication.** Reuse the existing app shell and navigation, but keep external email data separate from Fresh Connect direct messages.
3. **Provider credentials stay server-side.** The browser calls authenticated `/api/mail/*` endpoints; server code talks to the provider. Never expose service-role keys or mail-provider secrets to Vite client code.
4. **Dedicated persistence.** Use separate tables for mailbox/address ownership, message metadata/body, attachments, delivery events, and provider idempotency. Enable RLS on exposed tables; ownership rules must cover both reads and writes. Store raw provider payloads only when necessary and redact them in logs.
5. **Inbound is first-class.** Configure the provider's inbound MX/routing and a server webhook. Verify signatures, enforce idempotency, validate recipient routing, persist before acknowledging, and handle retries.
6. **Outbound is a state machine.** Persist a pending send, submit through the provider, record the provider ID, and reconcile sent/delivered/bounced/complained events. Do not show “sent” before provider acceptance.
7. **Attachments use private object storage.** Enforce size/type/quota limits, use short-lived signed downloads, and do not place message attachments in public buckets.
8. **AI is optional and scoped.** Summaries and drafts require explicit enablement. Sending, forwarding, deletion and external sharing require a direct user confirmation unless a narrowly scoped, revocable rule is configured.
9. **Admin observability is not blanket mailbox access.** Operators see service health, quotas, errors and abuse signals. Routine access to message bodies is not granted by an admin role.

## Execution order and release gates

### Gate A — Finish existing identity/security work

- Complete Fresh ID signup, email-confirmation, duplicate username, recovery, session restoration and post-login navigation E2E.
- Review the Supabase Auth leaked-password-protection warning and enable it if supported for the current plan/configuration.
- Stage the messaging-grant/RLS changes in PR #56; run SQL contract tests and two-account behavioral tests before production migration.
- Re-query live grants and policies after any approved migration. Do not use a passing static contract as proof of runtime authorization.

### Gate B — Prove provider + domain before UI claims

- Select a provider after checking inbound support, webhooks, retention, free/paid limits, account verification and Uganda-compatible payment options.
- Acquire or verify control of a domain. Add the provider's exact MX, SPF, DKIM and DMARC records and wait for verification.
- Demonstrate external send → external reply → inbound webhook → stored message → correct signed-in inbox.
- Demonstrate bounce/complaint event handling, duplicate webhook delivery, provider timeout and retry behavior.
- Record expected cost and limits for pilot scale. Do not promise a free unlimited mailbox service.

### Gate C — Implement mailbox backend

- Generate a proper Supabase migration using the project's supported CLI workflow; do not apply a guessed migration directly to production.
- Add owner-isolated schema, address uniqueness, message/event idempotency, attachment metadata and retention/export/delete behavior.
- Implement authenticated server routes, webhook verification, rate limits, input validation, structured redacted logs and provider error mapping.
- Test user A cannot list, read, mutate, attach to or delete user B's mailbox/message/attachment, including guessed IDs.

### Gate D — Build the connected user experience

- Add a Fresh Mail tab in the existing Communication workspace, reusing established app shell and navigation.
- Implement inbox, unread state, message detail, compose, reply, forward, drafts, sent, archive, spam/trash, search, attachment handling and settings in responsive mobile-first layouts.
- Show honest delivery states: draft, sending, accepted, delivered (only if provider confirms), bounced, failed.
- Provide loading, empty, offline, retry and permission-denied states; ensure controls are readable, keyboard-accessible and not clipped on small Android screens.

### Gate E — Integrate and launch safely

- Add optional Fresh AI actions with explicit mail scopes and confirmation before consequential actions.
- Add metrics and alerts for webhook failures, delivery failures, bounce/complaint rates, queue backlog, quota, latency and storage.
- Test backup/restore, account deletion, export, incident response, provider outage and rollback.
- Pilot with controlled recipients and strict quotas before opening public address registration.

## Definition of working Fresh Mail

Fresh Mail is not complete until a real user can sign in with Fresh ID, obtain a verified address on a domain we control, send to an external mailbox, receive an external reply into Fresh, reload and still see the message, access only their own mailbox, and observe truthful delivery/failure status. The same flow must pass on the deployed environment, not only in a mock or local UI.

## Current decision

Proceed with identity/security closure and provider/domain proof in parallel. Do not publish a working-mailbox promise or build a UI that implies email delivery works until Gate B has passed. Keep all changes in reviewable branches and run migrations only through the established migration workflow.
