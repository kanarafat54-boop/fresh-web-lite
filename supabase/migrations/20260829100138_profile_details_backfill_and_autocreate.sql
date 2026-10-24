-- Restored from production schema (20260829100138): profile_details table, auto-create on user insert, backfill
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.profile_details (
  user_id uuid not null,
  bio text default ''::text not null,
  avatar_url text,
  cover_url text,
  location text,
  website_url text,
  occupation text,
  company text,
  pronouns text,
  visibility text default 'public'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_details_pkey PRIMARY KEY (user_id),
  constraint profile_details_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'followers'::text, 'private'::text])))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.profile_details add column if not exists user_id uuid not null;
alter table public.profile_details add column if not exists bio text default ''::text not null;
alter table public.profile_details add column if not exists avatar_url text;
alter table public.profile_details add column if not exists cover_url text;
alter table public.profile_details add column if not exists location text;
alter table public.profile_details add column if not exists website_url text;
alter table public.profile_details add column if not exists occupation text;
alter table public.profile_details add column if not exists company text;
alter table public.profile_details add column if not exists pronouns text;
alter table public.profile_details add column if not exists visibility text default 'public'::text not null;
alter table public.profile_details add column if not exists created_at timestamp with time zone default now() not null;
alter table public.profile_details add column if not exists updated_at timestamp with time zone default now() not null;

CREATE OR REPLACE FUNCTION public.touch_profile_details()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_profile_details_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profile_details (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('profile_details', 'profile_details_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE')
    ) as v(tbl, conname, def)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then continue; end if;
    if exists (select 1 from pg_constraint where conname = r.conname and conrelid = to_regclass('public.' || quote_ident(r.tbl))) then continue; end if;
    begin
      execute format('alter table public.%I add constraint %I %s', r.tbl, r.conname, r.def);
    exception when undefined_table or undefined_column then
      raise notice 'skipped foreign key %: referenced object missing', r.conname;
    end;
  end loop;
end
$$;


alter table public.profile_details enable row level security;

drop policy if exists "profile details owner delete" on public.profile_details;
create policy "profile details owner delete" on public.profile_details for delete to public
  using (auth.uid() = user_id);

drop policy if exists "profile details owner insert" on public.profile_details;
create policy "profile details owner insert" on public.profile_details for insert to public
  with check (auth.uid() = user_id);

drop policy if exists "profile details owner update" on public.profile_details;
create policy "profile details owner update" on public.profile_details for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile details public read" on public.profile_details;
create policy "profile details public read" on public.profile_details for select to public
  using ((visibility = 'public'::text) OR (auth.uid() = user_id));

drop trigger if exists profile_details_touch on public.profile_details;
create trigger profile_details_touch BEFORE UPDATE ON public.profile_details FOR EACH ROW EXECUTE FUNCTION public.touch_profile_details();

-- Auto-create (users trigger) and backfill for existing users.
drop trigger if exists users_ensure_profile_details on public.users;
create trigger users_ensure_profile_details AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_details_for_user();

insert into public.profile_details (user_id)
select u.id from public.users u
on conflict (user_id) do nothing;
