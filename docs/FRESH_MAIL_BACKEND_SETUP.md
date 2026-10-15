# Fresh Mail backend core — operator runbook

This is a backend foundation, not a launch-ready mailbox. It is intentionally not connected to the production provider or database in this change.

## What this change provides

- A private server-mediated schema for address ownership, message records, and webhook event idempotency.
- An accessible, mobile-first Fresh Mail panel integrated into the existing Communication workspace, with inbox listing and plain-text compose.
- `GET /api/mail` to list only the verified Fresh ID user's records.
- `POST /api/mail` for plain-text outbound messages through Resend.
- `POST /api/mail?webhook=1` for signed `email.received` events, inbound body retrieval, active-address matching, and idempotent persistence.
- A static security contract check: `npm run test:fresh-mail-contract`.

## Required server-only environment

Set these only in Vercel server environment settings; never use a `VITE_` prefix for secrets:

- `RESEND_API_KEY` — provider API key with only the access needed for sending and receiving.
- `RESEND_WEBHOOK_SECRET` — signing secret copied from the Resend webhook configuration.
- `FRESH_MAIL_DOMAIN` — exact lowercase domain or subdomain approved for Fresh Mail addresses.
- `FRESH_MAIL_DOMAIN_ID` — the matching Resend domain ID. Provisioning checks that the provider reports this exact domain as verified with both sending and receiving enabled.
- `SUPABASE_URL` or existing `VITE_SUPABASE_URL` — project URL.
- `SUPABASE_PUBLISHABLE_KEY` or existing `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY` — used only to validate the Fresh ID access token.
- `SUPABASE_SECRET_KEY_FRESHWEBLITE` or existing `SUPABASE_SECRET_KEY` — server-only database access.

Do not copy secret values into GitHub, client variables, issue comments, screenshots, or logs.

## Safe activation sequence

1. Review the schema and route diffs in this PR.
2. Apply the migration only in a disposable test database using the project's approved migration workflow. This PR does not apply it to any database.
3. Run `npm run test:fresh-mail-contract`, `npm run lint`, and `npm run build`.
4. Add an active address row for a controlled test account only after its inbound domain and sender are verified. The migration defaults addresses to `pending`; the webhook intentionally ignores unassigned addresses.
5. Configure a Resend `email.received` webhook to `https://<deployment-host>/api/mail?webhook=1`; copy its signing secret to server-only environment settings.
6. Send a plain-text test message to an external mailbox, reply to the assigned inbound address, and verify that both messages persist after reload.
7. Repeat with two Fresh ID accounts and prove each account cannot read the other's records. Verify invalid signatures are rejected and provider retries do not duplicate messages.
8. Inspect Supabase grants/RLS and advisors after migration; do not treat a static test or successful build as security sign-off.

## Known limits — not implemented here

- The UI currently supports inbox listing and plain-text sending only; address provisioning, reply/forward/drafts/archive/spam/trash/search, attachments, and real delivery-status webhooks remain unimplemented.
- No custom domain has been verified or configured by this change.
- No provider key, webhook secret, database migration, or production deployment has been changed.
- Outbound `sent` means Resend accepted the request; it does not mean the recipient's server delivered it.
- Inbound HTML is stored as message content; the eventual UI must render it safely (prefer sandboxed rendering or sanitized HTML), not inject it directly into the application DOM.
- No user can provision or activate their own address through these routes. Address assignment remains an operator-controlled test step until a verified provisioning workflow exists.
