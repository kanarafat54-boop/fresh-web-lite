import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const schema = read("supabase/migrations/20261015060000_fresh_mail_core.sql");
const messages = read("api/mail.ts");
const webhook = read("api/mail.ts");
const ui = read("src/features/workspaces/FreshMailPanel.tsx");
const communication = read("src/features/workspaces/CommunicationWorkspace.tsx");

assert.match(schema, /create table if not exists public\.fresh_mail_addresses/i);
assert.match(schema, /create table if not exists public\.fresh_mail_messages/i);
assert.match(schema, /create table if not exists public\.fresh_mail_webhook_events/i);
assert.match(schema, /enable row level security/i);
assert.match(schema, /revoke all on table public\.fresh_mail_messages from public, anon, authenticated/i);
assert.match(schema, /grant all on table public\.fresh_mail_messages to service_role/i);
assert.match(schema, /fresh_mail_messages_owner_idempotency_uq/i);

assert.match(messages, /auth\.getUser\(token\)/);
assert.match(messages, /owner_id", user\.id/);
assert.match(messages, /RESEND_API_KEY/);
assert.match(messages, /Idempotency-Key/);
assert.match(messages, /requestFingerprint/);
assert.match(messages, /const storedKey = .*outbound:/);
assert.match(messages, /provider accepted the email, but Fresh Mail could not confirm local persistence/i);
assert.match(messages, /status: "sent"/);
assert.doesNotMatch(messages, /body\.ownerId|body\.userId|body\.owner_id/);

assert.match(webhook, /svix-id/);
assert.match(webhook, /svix-timestamp/);
assert.match(webhook, /svix-signature/);
assert.match(webhook, /timingSafeEqual/);
assert.match(webhook, /api\.resend\.com\/emails\/receiving/);
assert.match(webhook, /fresh_mail_webhook_events/);
assert.match(webhook, /provider_message_id/);
assert.match(webhook, /no_active_mailbox_match/);
assert.doesNotMatch(webhook, /body\.ownerId|body\.userId|body\.owner_id/);

assert.match(communication, /FreshMailPanel/);
assert.match(ui, /fetch\("\/api\/mail"/);
assert.match(ui, /type="submit"/);
assert.doesNotMatch(ui, /dangerouslySetInnerHTML/);

console.log("Fresh Mail contract checks passed.");
