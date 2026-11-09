-- Fresh Shorts reporting (spec 10.2, 10.3).
--
-- 1. Allows the report target types the app now sends. Production restricts reports.target_type to
--    ('post', 'short'), so reports on comments (short_comment, post_comment), profiles and sounds are rejected
--    today, including the existing comment report. This only widens the allowed set; every existing row stays valid.
-- 2. Adds an optional explanation (details) and a review status.
-- 3. Forces every client insert to status 'open', so a reporter can never set their own report's outcome.
--
-- `public.reports` already exists in production but has no creating migration in this repository, so it is
-- created here only if missing (mirroring the live columns, foreign key and policies) to keep the migration
-- history replayable. In production the create is a no-op.
-- Apply after schema review. Rollback: drop the trigger and function, drop the two columns, restore the
-- two-value check.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  reporter_id uuid references public.users (id) on delete cascade,
  reason text,
  created_at timestamptz default now()
);

alter table public.reports enable row level security;

do $$
begin
  create policy "Users can submit reports" on public.reports
    for insert to public with check ((select auth.uid()) = reporter_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can view their own reports" on public.reports
    for select to public using ((select auth.uid()) = reporter_id);
exception when duplicate_object then null;
end $$;

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports
  add constraint reports_target_type_check
  check (target_type in ('post', 'short', 'post_comment', 'short_comment', 'profile', 'sound'));

alter table public.reports
  add column if not exists details text,
  add column if not exists status text not null default 'open';

do $$
begin
  alter table public.reports
    add constraint reports_details_length check (details is null or char_length(details) <= 500);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.reports
    add constraint reports_status_valid check (status in ('open', 'reviewing', 'actioned', 'dismissed'));
exception when duplicate_object then null;
end $$;

create or replace function public.reports_force_open_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Client requests carry an authenticated user; reviewers using the service role or direct SQL do not.
  if auth.uid() is not null then
    new.status := 'open';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_force_open_status on public.reports;
create trigger reports_force_open_status
  before insert on public.reports
  for each row execute function public.reports_force_open_status();

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_target_idx on public.reports (reporter_id, target_type, target_id);

notify pgrst, 'reload schema';
