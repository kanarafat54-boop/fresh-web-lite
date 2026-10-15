# Fresh Identity + Fresh Mail — Product and Engineering Blueprint

**Status:** Planning baseline; implementation not yet started  
**Date:** 2026-10-14  
**Repository:** `kanarafat54-boop/fresh-web-lite`  
**Principle:** Aim for dramatically greater usefulness through integration, trust, accessibility, and reliable end-to-end workflows—not feature count alone.

## 1. Product outcome

Fresh Identity is the account and permissions foundation for Fresh Web Lite. Fresh Mail is a real email product built on that identity. The combined experience should let a person create an account, claim a unique Fresh username, provision a real mailbox on a domain FWL controls, send and receive external email, and use authorized FWL tools to turn communications into useful work.

Do not describe an address as a working email mailbox until provider provisioning, inbound delivery, outbound delivery, storage, access control, and recovery have been verified.

## 2. Product principles

1. **One identity, explicit service permissions.** A single FWL account can access multiple services, but each service receives only the permissions it needs.
2. **Real capability over simulated UI.** No fake sent/delivered states, invented inbox messages, or green health indicators without evidence.
3. **Private by default.** Mail bodies, attachments, recipient lists, and private search results must not be public or visible to other users or general administrators by default.
4. **Human control over AI actions.** AI may summarize, classify, extract tasks, suggest replies, and prepare drafts. Sending, forwarding, deleting, changing account security, or sharing private content requires explicit user confirmation unless the user has deliberately configured a narrow, revocable rule.
5. **Accessible and resilient.** Design for small Android screens, low memory, weak networks, scalable text, screen readers, large touch targets, retry-safe actions, and visible failure states.
6. **Interoperable first.** Support ordinary external email standards and providers. Do not require recipients to join FWL.
7. **Affordable by design.** Start with hosted infrastructure, enforce quotas and abuse controls, measure per-user costs, and avoid self-hosting mail servers until operational maturity justifies it.
8. **Privacy and portability.** Users need understandable export, retention, deletion, consent, and connected-app controls.
9. **Safe operations.** Admins can see operational health, delivery status, abuse signals, and redacted diagnostics without routine access to message contents.
10. **No unverified superlatives.** “20× more useful” is a product ambition to validate with user outcomes, not a performance or market claim.

## 3. Current verified baseline

Repository inspection on 2026-10-14 found:
- The app uses React, Vite, React Router, and `@supabase/supabase-js`.
- Fresh ID authentication code already exists, including Supabase sign-up/sign-in, password recovery, session handling, and passkey-related flows.
- Vercel server-side API routes exist and should be reused where suitable.
- The connected Supabase project `fwbbyowalnfckpmbutcz` reports `ACTIVE_HEALTHY`.
- The live database has an existing `public.users` table with unique `username` and `email` columns, plus existing `direct_messages`, `fresh_communication_threads`, and `fresh_communication_messages` tables.
- Those existing communication tables are not evidence of an external email service. Keep internal FWL messaging distinct from SMTP/API-based email.
- The database reports 80 migrations at inspection time. A live schema/security review is required before any new migration.
- The latest inspected Supabase security-advisor response was empty, but the response parsing and exact advisor coverage must be confirmed before treating this as a security sign-off.

This is a baseline, not proof that the live registration journey, all RLS policies, provider configuration, or production email delivery currently work.

## 4. Domain and address strategy

The current `fresh-web-lite.vercel.app` host is a deployment subdomain, not a domain FWL controls for arbitrary mail DNS. Do not promise real mailboxes at `@fresh-web-lite.vercel.app`.

Preferred path:
1. Compare low-cost domains that FWL can register and renew reliably.
2. Use a dedicated mail domain or mail subdomain under a domain we control.
3. Verify ownership with the chosen provider and configure only the DNS records that provider specifies (typically MX, SPF, DKIM, and DMARC; inbound routing may require additional records).
4. Keep the address-domain mapping configurable so a future migration to `@fresh.com) or another owned domain does not require redesigning user identity.
5. Never display an address as provisioned until provisioning is confirmed by the provider.

A public FWL username and a deliverable email address are separate concepts. Reserve usernames atomically; provision mailboxes only when policy, quota, verification, and provider capability permit.

## 5. Architecture

### Fresh Identity
- Reuse Supabase Auth and the existing Fresh ID context.
- Use the immutable authenticated user UUID as the account identity.
- Keep public username, verified email, account status, and mailbox aliases distinct.
- Enforce username uniqueness in the database; validate format and reserved names server-side.
- Do not authorize using user-editable metadata.
- Use server-side checks for privileged changes and sensitive account actions.

### Fresh Mail application
- Mobile-first inbox and message detail views.
- Compose, reply, forward, sent, drafts, archive, trash, spam, search, unread state, contacts, attachments, and settings.
- Clear pending/sent/failed/bounced states; retry must be idempotent.
- Pagination and bounded rendering for large inboxes.
- Keyboard, screen-reader, scalable type, high-contrast, and reduced-motion support.
- Never seed a production inbox with fake messages.

### Mail provider adapter
Define a provider-neutral server interface for:
- verify domain and provider capability;
- provision/suspend/delete mailbox or alias;
- send message;
- verify and process inbound webhook;
- fetch or store message content and attachment metadata;
- process delivery, bounce, complaint, and suppression events;
- expose quota and health status.

The chosen provider must be proven to support actual inbound mailboxes or inbound message routing plus a durable mailbox implementation. A send-only email API is not a complete mailbox service.

### Data and storage
Before adding tables, inspect current migrations, grants, RLS policies, storage buckets, and relationships. Prefer a private schema for sensitive email internals when appropriate; otherwise ensure every exposed table has explicit grants and RLS. Proposed logical entities:
- identity/address reservation and domain mapping;
- mailbox provisioning state and provider reference;
- messages and recipient/envelope metadata;
- message bodies or private object-storage references;
- attachment metadata and scan state;
- delivery/provider events and webhook idempotency records;
- user mail preferences, quota, and retention policy.

These are logical entities, not approved final table names. Do not duplicate existing structures without schema review. Never store provider API secrets in database rows accessible to clients.

### AI and FWL integrations
- Summarize a thread, extract action items, identify dates, draft replies, translate, and explain suspicious messages.
- Treat email content as untrusted input; instructions inside messages must not override system policy or authorize tool use.
- Only search mail after explicit user authorization and enforce per-user access at the server/data boundary.
- Do not train models on private mail by default.
- Require confirmation before sending or sharing content; show recipients and attachments in the final confirmation.
- Integrate with tasks, calendar, documents, Fresh AI, and global search through narrow permission scopes, auditable actions, and revocation.

## 6. Delivery phases and gates

### Phase 0 — Audit and design gate
- Record current main SHA and production deployment SHA.
- Inspect Fresh ID flows, username rules, current migrations, RLS/grants, storage, Vercel routing, environment variables by name only, and deployment logs.
- Map all relevant tables and policies; check for existing identity/address concepts.
- Confirm domain ownership options and compare providers on inbound support, outbound delivery, mailbox semantics, API access, data retention, abuse handling, pricing, and portability.
- Deliver a written threat model, data-flow diagram, provider decision, migration plan, and test matrix.

**Exit gate:** no unresolved architecture assumption is disguised as an implemented capability.

### Phase 1 — Fresh Identity hardening
- Validate sign-up fields and policy consent.
- Enforce normalized username format and database uniqueness.
- Make username claim/rename race-safe and protect reserved names.
- Ensure users cannot change their own role, verification status, subscription tier, or mailbox provisioning state through client-controlled fields.
- Test email confirmation, password reset, session restore, logout, and account recovery.
- Provide accessible errors, loading, retry, and navigation states.

**Exit gate:** authenticated identity tests pass; duplicate claims and unauthorized updates are rejected in the live database.

### Phase 2 — Domain and provider proof
- Choose a domain FWL can control and renew.
- Set up a sandbox or test domain first where available.
- Verify domain ownership and DNS; confirm sender authentication and inbound routing.
- Create a provider test mailbox/recipient and send to independent external accounts.
- Test replies, bounces, complaints, invalid recipients, provider outage, webhook signature failures, and duplicate webhook delivery.
- Estimate cost at 100, 1,000, and 10,000 active mailboxes before enabling public signup.

**Exit gate:** a real external send-and-reply journey succeeds, with provider evidence and safe logs.

### Phase 3 — Private mailbox backend
- Implement mailbox provisioning as a retry-safe server workflow.
- Persist provider message IDs and delivery states.
- Secure message storage and attachment downloads.
- Verify every query is scoped to the authenticated mailbox owner.
- Add inbound processing, idempotency, limits, cleanup, retention, export, and deletion.
- Ensure provider webhooks cannot impersonate users or create arbitrary privileged records.

**Exit gate:** two-account isolation tests pass; one account cannot list, fetch, mutate, or download another account's messages or attachments.

### Phase 4 — Fresh Mail UI
- Build inbox, message view, compose, reply, forward, sent, drafts, archive, spam, trash, search, attachments, and settings.
- Add optimistic UI only when rollback/error behavior is correct.
- Show truthful message states and make retries safe.
- Test narrow Android viewports, slow networks, offline/reconnect, large threads, and accessible navigation.

**Exit gate:** a real user can send to an external mailbox, receive a reply, reload, and see persisted results.

### Phase 5 — Safety, intelligence, and integration
- Add spam/abuse handling, sending quotas, complaint/bounce monitoring, phishing warnings, attachment controls, and account recovery.
- Add AI summaries, draft assistance, and action extraction with consent and confirmation gates.
- Integrate with FWL tasks, calendar, documents, and global search using explicit scopes.
- Add privacy dashboard, data export, deletion, retention, and consent controls.

**Exit gate:** misuse tests, consent tests, cross-account tests, and action-confirmation tests pass.

### Phase 6 — Controlled launch and scaling
- Launch to a small opt-in cohort with quotas and a clear support path.
- Monitor delivery, bounce/complaint rates, latency, queue age, provider costs, account abuse, and user-reported failures.
- Establish backups, incident response, rollback, retention and recovery drills.
- Expand capacity only when service reliability, deliverability, and unit economics justify it.

**Exit gate:** production smoke tests and a recovery drill pass; launch limits and rollback plan are documented.

## 7. Security and abuse threat model

Must test at minimum:
- cross-account message/body/attachment access;
- username squatting, race conditions, reserved names, and address spoofing;
- fake or replayed inbound webhooks;
- duplicate sends and duplicate event processing;
- spam campaigns, account takeover, open-relay behavior, bounce/complaint abuse;
- malicious HTML, tracking pixels, unsafe attachment types, oversized payloads, and phishing links;
- prompt injection in email content and AI data leakage across users;
- forged client claims for roles, verification, quotas, or provider state;
- insecure signed URLs, logs that leak message content, and unbounded retention;
- provider outage, DNS failure, quota exhaustion, delayed webhooks, and partial provisioning.

Do not call the system secure based only on an RLS-enabled flag or an empty advisory response. Validate effective policies, grants, server routes, storage policies, and negative tests.

## 8. Product usefulness metrics

Measure outcomes instead of feature counts:
- successful external send and reply rate;
- inbox load and search latency;
- percentage of messages with truthful, reconciled delivery status;
- user task completion time for finding, replying, and following up;
- accessibility and mobile completion rate;
- spam/phishing detection quality and false positives;
- unauthorized access tests blocked;
- recovery success and account-lockout rate;
- cost per active mailbox and cost per 1,000 delivered messages;
- AI draft acceptance/edit rate and user-reported usefulness;
- deletion/export completion and automation revocation success.

## 9. Release discipline

Every phase must record:
- code branch and commit SHA;
- migrations applied and verification query;
- automated test output;
- provider sandbox/production evidence;
- deployed URL and deployment status;
- smoke test results on the deployed version;
- known limitations, rollback target, and next blocking issue.

A code commit, passing unit test, or successful build is not proof of end-to-end email delivery. Do not expose secrets, internal diagnostics, or private mail content in user-facing logs.

## 10. Immediate next actions

1. Complete Phase 0 audit before adding production tables or changing access policies.
2. Confirm whether the chosen domain will be the long-term primary mail domain or a migration-ready starter domain.
3. Compare provider capabilities and full mailbox costs; select only after inbound/outbound behavior is proven.
4. Implement Fresh Identity hardening and test it before mailbox provisioning.
5. Deliver the smallest real end-to-end email flow before expanding into AI and automation.

**Definition of done for the first real release:** a verified FWL user owns a unique Fresh Identity, receives a correctly provisioned mailbox on a domain FWL controls, sends an email to an independent external provider, receives a reply, sees persisted messages on reload, and cannot access another user's mailbox.
