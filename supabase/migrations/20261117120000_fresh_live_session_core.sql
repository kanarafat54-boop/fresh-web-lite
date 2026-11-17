-- Fresh Live Phase 1: core session and participant tables + RLS.
-- Additive only. No media provider, no paid infrastructure, no production claim of streaming.
-- Sessions are control-plane records only. Status LIVE is reserved for a future path that
-- confirms real media resources; the control plane alone must not pretend a stream is live.
-- Rollback: drop tables public.live_participants, public.live_sessions (in that order).

-- Canonical session record (control plane).
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'other',
  visibility text not null default 'public'
    check (visibility in ('public', 'followers', 'unlisted', 'private')),
  status text not null default 'draft'
    check (status in (
      'draft', 'scheduled', 'ready', 'live', 'interrupted',
      'ending', 'ended', 'cancelled', 'failed', 'processing', 'replay_ready'
    )),
  media_mode text not null default 'unset'
    check (media_mode in ('unset', 'webrtc', 'rtmps', 'hls', 'audio')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  provider_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_sessions_title_len check (char_length(trim(title)) between 1 and 120),
  constraint live_sessions_description_len check (char_length(description) <= 2000),
  constraint live_sessions_category_len check (char_length(category) between 1 and 64)
);

create index if not exists live_sessions_creator_idx on public.live_sessions (creator_id);
create index if not exists live_sessions_status_idx on public.live_sessions (status);
create index if not exists live_sessions_visibility_status_idx on public.live_sessions (visibility, status);
create index if not exists live_sessions_created_at_idx on public.live_sessions (created_at desc);

-- Membership and roles.
create table if not exists public.live_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('host', 'co_host', 'guest', 'moderator', 'speaker', 'viewer')),
  state text not null default 'joined'
    check (state in ('invited', 'requested', 'joined', 'left', 'removed', 'banned')),
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_participants_unique_active unique (session_id, user_id)
);

create index if not exists live_participants_session_idx on public.live_participants (session_id);
create index if not exists live_participants_user_idx on public.live_participants (user_id);
create index if not exists live_participants_role_idx on public.live_participants (session_id, role);

-- updated_at helper
create or replace function public.live_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists live_sessions_set_updated_at on public.live_sessions;
create trigger live_sessions_set_updated_at
  before update on public.live_sessions
  for each row execute function public.live_set_updated_at();

drop trigger if exists live_participants_set_updated_at on public.live_participants;
create trigger live_participants_set_updated_at
  before update on public.live_participants
  for each row execute function public.live_set_updated_at();

-- RLS
alter table public.live_sessions enable row level security;
alter table public.live_participants enable row level security;

-- Sessions: creator full control; public/unlisted readable by authenticated when not private/draft/cancelled.
do $$
begin
  create policy live_sessions_select on public.live_sessions
    for select to authenticated
    using (
      creator_id = (select auth.uid())
      or (
        visibility in ('public', 'unlisted')
        and status not in ('draft', 'cancelled')
      )
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy live_sessions_insert_own on public.live_sessions
    for insert to authenticated
    with check (creator_id = (select auth.uid()));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy live_sessions_update_own on public.live_sessions
    for update to authenticated
    using (creator_id = (select auth.uid()))
    with check (creator_id = (select auth.uid()));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy live_sessions_delete_own on public.live_sessions
    for delete to authenticated
    using (creator_id = (select auth.uid()) and status in ('draft', 'cancelled', 'ended'));
exception when duplicate_object then null;
end $$;

-- Participants: members of the session can read; host/co_host can manage; users can insert themselves as viewer when allowed.
do $$
begin
  create policy live_participants_select on public.live_participants
    for select to authenticated
    using (
      user_id = (select auth.uid())
      or exists (
        select 1 from public.live_sessions s
        where s.id = session_id
          and (
            s.creator_id = (select auth.uid())
            or (s.visibility in ('public', 'unlisted') and s.status not in ('draft', 'cancelled'))
          )
      )
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy live_participants_insert on public.live_participants
    for insert to authenticated
    with check (
      user_id = (select auth.uid())
      or exists (
        select 1 from public.live_sessions s
        where s.id = session_id and s.creator_id = (select auth.uid())
      )
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy live_participants_update on public.live_participants
    for update to authenticated
    using (
      user_id = (select auth.uid())
      or exists (
        select 1 from public.live_sessions s
        where s.id = session_id and s.creator_id = (select auth.uid())
      )
    )
    with check (
      user_id = (select auth.uid())
      or exists (
        select 1 from public.live_sessions s
        where s.id = session_id and s.creator_id = (select auth.uid())
      )
    );
exception when duplicate_object then null;
end $$;

revoke all on public.live_sessions from anon;
revoke all on public.live_participants from anon;
grant select, insert, update, delete on public.live_sessions to authenticated;
grant select, insert, update, delete on public.live_participants to authenticated;

notify pgrst, 'reload schema';
