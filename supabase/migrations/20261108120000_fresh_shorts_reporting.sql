-- Fresh Shorts reporting (spec 10.2, 10.3): an optional explanation and a review status on reports.
-- Additive only. Existing rows keep working: they get status 'open' and no explanation.
-- The reporter can never set their own report's status: a trigger forces 'open' on every client insert, so
-- review outcomes can only be recorded by a reviewer using the service role or the database.
-- Apply after schema review. Rollback: drop the trigger and function, then drop the two columns.

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
