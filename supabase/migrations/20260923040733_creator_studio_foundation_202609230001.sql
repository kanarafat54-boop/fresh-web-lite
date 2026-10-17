-- Fresh Creator Studio persistence
create table if not exists public.creator_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('post','short')),
  content text not null default '',
  media_url text,
  media_kind text check (media_kind in ('image','video') or media_kind is null),
  status text not null default 'draft' check (status in ('draft','scheduled','published')),
  scheduled_at timestamptz,
  published_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creator_drafts_user_created_idx on public.creator_drafts(user_id, created_at desc);
alter table public.creator_drafts enable row level security;

drop policy if exists "creator drafts owner read" on public.creator_drafts;
create policy "creator drafts owner read" on public.creator_drafts for select using (auth.uid() = user_id);
drop policy if exists "creator drafts owner insert" on public.creator_drafts;
create policy "creator drafts owner insert" on public.creator_drafts for insert with check (auth.uid() = user_id);
drop policy if exists "creator drafts owner update" on public.creator_drafts;
create policy "creator drafts owner update" on public.creator_drafts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "creator drafts owner delete" on public.creator_drafts;
create policy "creator drafts owner delete" on public.creator_drafts for delete using (auth.uid() = user_id);

create or replace function public.touch_creator_draft() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists creator_draft_touch on public.creator_drafts;
create trigger creator_draft_touch before update on public.creator_drafts
for each row execute function public.touch_creator_draft();
