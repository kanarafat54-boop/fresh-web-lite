-- Fresh Mail core: private server-mediated tables. Do not apply until reviewed against a disposable database.
-- Browser roles intentionally receive no table grants; API routes validate Fresh ID sessions
-- and derive owner_id from the verified JWT before using the server-only Supabase key.

create table if not exists public.fresh_mail_addresses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  email_address text not null,
  provider text not null default 'resend' check (provider in ('resend')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fresh_mail_address_normalized check (
    email_address = lower(btrim(email_address))
    and email_address ~ '^[^@[:space:]]+@[^@[:space:]]+$'
  )
);

create unique index if not exists fresh_mail_addresses_email_lower_uq
  on public.fresh_mail_addresses (lower(email_address));
create index if not exists fresh_mail_addresses_owner_status_idx
  on public.fresh_mail_addresses (owner_id, status);

create table if not exists public.fresh_mail_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'resend' check (provider in ('resend')),
  provider_message_id text,
  idempotency_key text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  from_address text not null,
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  subject text not null default '',
  text_body text not null default '',
  html_body text,
  status text not null check (
    status in ('queued', 'sent', 'received', 'failed', 'ignored')
  ),
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  received_at timestamptz,
  constraint fresh_mail_idempotency_key_length check (
    length(idempotency_key) between 8 and 180
  )
);

create unique index if not exists fresh_mail_messages_owner_idempotency_uq
  on public.fresh_mail_messages (owner_id, idempotency_key);
create unique index if not exists fresh_mail_messages_owner_provider_id_uq
  on public.fresh_mail_messages (owner_id, provider, provider_message_id)
  where provider_message_id is not null;
create index if not exists fresh_mail_messages_owner_created_idx
  on public.fresh_mail_messages (owner_id, created_at desc);
create index if not exists fresh_mail_messages_owner_direction_status_idx
  on public.fresh_mail_messages (owner_id, direction, status, created_at desc);

create table if not exists public.fresh_mail_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend' check (provider in ('resend')),
  provider_event_id text not null,
  provider_message_id text,
  event_type text not null,
  status text not null default 'processing' check (
    status in ('processing', 'processed', 'ignored', 'failed')
  ),
  failure_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint fresh_mail_webhook_event_id_length check (
    length(provider_event_id) between 1 and 200
  )
);

create unique index if not exists fresh_mail_webhook_events_provider_id_uq
  on public.fresh_mail_webhook_events (provider, provider_event_id);
create index if not exists fresh_mail_webhook_events_status_idx
  on public.fresh_mail_webhook_events (status, received_at);

alter table public.fresh_mail_addresses enable row level security;
alter table public.fresh_mail_messages enable row level security;
alter table public.fresh_mail_webhook_events enable row level security;

revoke all on table public.fresh_mail_addresses from public, anon, authenticated;
revoke all on table public.fresh_mail_messages from public, anon, authenticated;
revoke all on table public.fresh_mail_webhook_events from public, anon, authenticated;
grant all on table public.fresh_mail_addresses to service_role;
grant all on table public.fresh_mail_messages to service_role;
grant all on table public.fresh_mail_webhook_events to service_role;

comment on table public.fresh_mail_addresses is
  'Fresh Mail address ownership. Server-managed only; activate only after provider/domain verification.';
comment on table public.fresh_mail_messages is
  'Fresh Mail message ledger. Private server-mediated access; direct browser table access is revoked.';
comment on table public.fresh_mail_webhook_events is
  'Idempotent provider webhook ledger. Never store webhook secrets or full payloads here.';
