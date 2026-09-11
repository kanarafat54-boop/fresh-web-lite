-- Fresh AI durable conversation and turn ledger.
-- Keeps the chat surface simple while preserving durable identity/context.
create table if not exists public.fresh_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text null,
  route text not null default '/ai',
  surface text null,
  model_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fresh_ai_conversations_user_idx on public.fresh_ai_conversations(user_id, updated_at desc);

create table if not exists public.fresh_ai_conversation_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.fresh_ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid null,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  model_id text null,
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fresh_ai_turns_conversation_idx on public.fresh_ai_conversation_turns(conversation_id, created_at asc);
create index if not exists fresh_ai_turns_user_idx on public.fresh_ai_conversation_turns(user_id, created_at desc);

alter table public.fresh_ai_conversations enable row level security;
alter table public.fresh_ai_conversation_turns enable row level security;

drop policy if exists fresh_ai_conversations_owner on public.fresh_ai_conversations;
create policy fresh_ai_conversations_owner on public.fresh_ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists fresh_ai_turns_owner on public.fresh_ai_conversation_turns;
create policy fresh_ai_turns_owner on public.fresh_ai_conversation_turns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
