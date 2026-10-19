# Fresh Communication — Unified Product and Architecture Proposal

**Status:** Proposed architecture; not production implementation  
**Owner identity:** Fresh ID  
**Product:** Fresh Web Lite / Fresh Communication  
**Principle:** One communication home, one identity, connected history and search, purpose-built delivery systems behind it.

## Executive recommendation

Yes: the entire communication experience should live inside Fresh. A user should not need to jump between separate Fresh Mail, chat, notifications, calls, and AI screens to understand or continue a conversation.

Unify the user experience, identity, navigation, discovery, privacy controls, and conversation context. Do **not** force email, real-time chat, voice/video, push notifications, and AI sessions into one giant table or one transport. Those systems have different delivery, retention, security, and reliability requirements.

Fresh Communication should be the shared product shell over specialized, permissioned services and adapters.

## 1. The user-facing product

A single top-level destination: **Fresh Communication**.

- **Unified Inbox** — one chronological view of new activity, with filters for Email, Direct, Groups, Calls, Notifications, and AI. Users can choose combined or separate views.
- **Conversations** — one thread view where an internal discussion can link to an email, a call, a shared file, or an AI-generated summary without pretending these are identical message types.
- **Fresh Mail** — external email addresses, inbox, sent, drafts, replies, attachments, folders/labels, spam, archive, and delivery states.
- **Direct & Group Chat** — internal Fresh-to-Fresh messages, typing/presence when online, read receipts as opt-in, group membership and moderation.
- **Calls & Voice** — voice notes first; real-time audio/video later after network, device, privacy, and cost testing.
- **Notifications** — one preference center, with quiet hours, per-channel controls, and a digest; no engagement-bait defaults.
- **Fresh AI** — optional summarization, search, drafting, translation, and action suggestions, always clearly marked as AI-generated and never silently sending a message.
- **Files & shared items** — a conversation-scoped view of attachments, links, and documents, governed by the source conversation's permissions.

The UI should be mobile-first, work on small and low-memory Android devices, use readable text and large touch targets, support keyboard/screen readers, and avoid requiring horizontal swiping to discover essential controls. Users should be able to hide channels they do not use.

## 2. Identity and addressing

Fresh ID is the account identity and authorization source. Communication addresses are distinct, verified identifiers attached to that account:

- **Fresh ID username** — internal discovery and direct messages.
- **Fresh Mail address** — an externally routable email address on a domain Fresh controls.
- **Optional contact methods** — phone or other verified channels only if/when implemented.

Do not automatically expose a user's email address, phone number, date of birth, or real name to other users. Users need explicit controls for discoverability, address visibility, blocking, and who may message them.

Do not promise an address until domain/provider verification and mailbox provisioning succeed. A Fresh username is not automatically an email address.

## 3. Architecture: unified experience, separate secure services

### A. Product shell

One navigation entry and consistent conversation UI. The shell requests only data the signed-in user is allowed to see. The combined inbox is a presentation/query layer, not a reason to grant broad cross-table access.

### B. Communication directory and thread index

A minimal common index for participants, channel type, display title, last-activity time, unread state, and links to the underlying source records. It must not duplicate private message bodies just to make the inbox fast.

Every index entry must have a source type, source ID, visibility/participant model, and authorization check. Rebuildable indexes should not become the authority for access decisions.

### C. Purpose-built data stores

- Internal direct/group messages remain distinct from external email.
- Email records keep envelope sender/recipients, headers, provider message IDs, threading identifiers, delivery events, normalized body, and attachment references.
- Calls store call/session metadata and participant permissions; recording is off by default and requires clear consent/legal review.
- AI session records are distinct from human messages, with explicit user controls for whether they may be used for summaries or suggestions.
- Notifications are delivery pointers and preferences, not copied full message bodies.

Reuse existing FWL tables only after validating their schema and authorization behavior. In particular, audit `direct_messages`, `fresh_communication_threads`, and `fresh_communication_messages` before extending them. Do not retrofit email into the existing internal-message table.

### D. Provider adapters and event processing

External email provider integration lives behind a server-side adapter. Client apps never receive provider secrets.

- Outbound: authenticated compose request → authorization and abuse/quota checks → durable send job/outbox → provider API → delivery/bounce events → status visible in Fresh.
- Inbound: provider webhook → signature/timestamp verification → idempotency/replay check → recipient/mailbox mapping → durable message and attachment metadata → inbox index/notification.
- Retries use bounded backoff and idempotency keys. A webhook may be delivered more than once; processing must not create duplicate messages.
- Provider outages must not erase drafts or make Fresh claim a message was delivered when it was only queued.
- Store provider IDs and delivery events so a provider can be changed later without losing the user's mailbox history.

The first provider candidate is Resend for a proof of concept because its documented inbound model includes webhooks, receiving APIs, and attachment retrieval. This is not a final selection: validate current plan limits, retention, domain support, and full cost first. Mailgun and Amazon SES remain alternatives.

## 4. Security and privacy boundaries

- Supabase Auth/Fresh ID owns authentication; authorization is enforced by database policies and server routes, not UI visibility alone.
- Never place Supabase service-role/secret keys or mail-provider API keys in browser code, public environment variables, logs, or AI prompts.
- Every operation must authorize both the actor and the target mailbox/thread. Knowing a UUID must never grant access.
- Enable RLS on exposed tables and verify effective grants as well as policies. RLS does not make a broadly granted table safe by itself.
- Validate provider webhook signatures against the raw request body using the provider's documented scheme; reject invalid signatures and replays.
- Private attachments belong in private storage, with short-lived authorized downloads; public buckets are inappropriate for private mail.
- Protect against spam, spoofing, phishing, oversized messages, malicious attachments, HTML email tracking, and abusive sending. Sanitize/render HTML email safely and load remote images only under an explicit privacy policy.
- Minimize logs: IDs, timings, provider status, and safe error codes by default; do not log message bodies, access tokens, or attachments.
- Provide block/report, spam handling, rate limits, quotas, account recovery, export, deletion, and retention policies.
- Keep sensitive profile data such as DOB separate from public communication profiles.
- AI features are opt-in and permission-scoped. AI must not search or summarize a thread the current user cannot read, and must not send or forward without explicit confirmation.

## 5. Reliability and delivery truth

Use clear, separate states:
- **Draft** — saved only in Fresh.
- **Queued** — accepted by Fresh for processing.
- **Sent to provider** — provider accepted the send request.
- **Delivered** — provider supplied delivery confirmation where available; do not infer it merely from an API success.
- **Bounced / Failed** — show a useful explanation and a retry path where safe.
- **Received** — inbound message is durably stored and mapped to the correct mailbox.

Internal chat may use its own delivery/read states. Do not label email as read just because a notification was opened; email read receipts are unreliable and privacy-sensitive.

## 6. Build order

### Phase 0 — audit and acceptance criteria
- Complete Fresh ID registration, email confirmation, recovery, session restore, and landing-page navigation tests.
- Verify all communication-table policies and grants, including cross-thread and cross-account negative tests.
- Review server routes, storage buckets/policies, secret handling, redirect URLs, and Supabase Auth security settings.
- Approve the domain/provider and total recurring cost only after a sandbox proof.

### Phase 1 — secure foundation
- Fix verified communication authorization gaps through reviewed migrations and negative tests.
- Define common thread/index contracts without copying private message content.
- Define event idempotency, audit events, retention, deletion, quotas, and failure states.

### Phase 2 — first complete Fresh Mail journey
- Verify a domain and provider in a sandbox.
- Register/claim an address only after provisioning succeeds.
- Send to an independent external account, reply back, reload, and verify both messages persist.
- Add compose, inbox, thread view, sent, drafts, attachment permissions, bounce/failure handling, and owner-isolation tests.

### Phase 3 — unified inbox
- Bring existing Fresh direct/group messages into the common inbox through permission-checked adapters.
- Add unread counts, search, filters, notification settings, and conversation linking.
- Preserve existing messaging behavior and migrate gradually; no destructive rewrite.

### Phase 4 — calls and collaboration
- Voice notes and shared files first; then real-time voice/video, presence, and group features only after device/network and cost tests.
- Add calendar/task handoffs only with explicit user intent and permissions.

### Phase 5 — AI and ecosystem integration
- Summaries, translation, draft suggestions, search, and action extraction.
- Clear provenance, per-conversation opt-in, user review, and explicit confirmation before external actions.

## 7. MVP acceptance tests

1. A newly registered user confirms email, signs in, restores their profile, and reaches the intended Fresh landing page.
2. A user cannot read or mutate another user's private profile, thread, message, email, attachment, or delivery event by guessing IDs.
3. A user can send an external email, receive a reply from an independent account, and see both persist after reload.
4. Repeated provider webhooks do not create duplicate messages; invalid signatures are rejected.
5. Bounce, invalid recipient, rate limit, timeout, and provider outage produce truthful status and safe retry behavior.
6. Internal chat still works after unified-inbox integration, with participant/thread authorization tests passing.
7. Combined search respects the source permissions of every result and does not leak subject lines/snippets from inaccessible mail.
8. Small-screen, keyboard, screen-reader, zoom, and reduced-motion checks pass for core communication flows.
9. Export/deletion and retention behavior is documented and exercised.
10. Preview and production deployments record the tested commit SHA and a rollback plan.

## 8. Decisions needed before paid setup

- Approve a domain name and renewal price.
- Approve a maximum monthly mail-provider budget and initial daily send quota.
- Decide whether Fresh Mail addresses are available to all users immediately or through a controlled beta.
- Confirm whether internal messages and external emails should share one default inbox (recommended) or open in separate tabs by default (filters should always remain available).

## Final design principle

**One Fresh Communication experience, one Fresh ID, many permissioned communication channels.** The user sees one connected system; the engineering keeps each channel reliable, auditable, and secure.
