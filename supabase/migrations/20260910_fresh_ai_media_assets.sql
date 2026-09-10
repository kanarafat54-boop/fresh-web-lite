create table if not exists public.fresh_ai_media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid null,
  conversation_id uuid null references public.fresh_ai_conversations(id) on delete set null,
  kind text not null check (kind in ('image','video','audio','file')),
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  model_id text null,
  prompt text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fresh_ai_media_user_idx on public.fresh_ai_media_assets(user_id, created_at desc);
create index if not exists fresh_ai_media_conversation_idx on public.fresh_ai_media_assets(conversation_id, created_at desc);
alter table public.fresh_ai_media_assets enable row level security;
drop policy if exists fresh_ai_media_owner on public.fresh_ai_media_assets;
create policy fresh_ai_media_owner on public.fresh_ai_media_assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
insert into storage.buckets (id, name, public) values ('fresh-ai-media','fresh-ai-media',false) on conflict (id) do nothing;
notify pgrst, 'reload schema';
