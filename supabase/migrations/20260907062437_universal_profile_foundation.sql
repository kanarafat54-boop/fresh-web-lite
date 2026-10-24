-- Restored from production schema (20260907062437): universal profile foundation
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.universal_profiles (
  user_id uuid not null,
  headline text,
  bio text,
  avatar_seed text,
  cover_image_url text,
  profile_visibility text default 'public'::text not null,
  updated_at timestamp with time zone default now() not null,
  constraint universal_profiles_pkey PRIMARY KEY (user_id),
  constraint universal_profiles_profile_visibility_check CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text])))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.universal_profiles add column if not exists user_id uuid not null;
alter table public.universal_profiles add column if not exists headline text;
alter table public.universal_profiles add column if not exists bio text;
alter table public.universal_profiles add column if not exists avatar_seed text;
alter table public.universal_profiles add column if not exists cover_image_url text;
alter table public.universal_profiles add column if not exists profile_visibility text default 'public'::text not null;
alter table public.universal_profiles add column if not exists updated_at timestamp with time zone default now() not null;

create table if not exists public.profile_links (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  label text not null,
  url text not null,
  "position" integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  constraint profile_links_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.profile_links add column if not exists id uuid default gen_random_uuid() not null;
alter table public.profile_links add column if not exists user_id uuid not null;
alter table public.profile_links add column if not exists label text not null;
alter table public.profile_links add column if not exists url text not null;
alter table public.profile_links add column if not exists "position" integer default 0 not null;
alter table public.profile_links add column if not exists created_at timestamp with time zone default now() not null;

create table if not exists public.profile_portfolio_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text default ''::text not null,
  url text,
  image_url text,
  "position" integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_portfolio_items_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.profile_portfolio_items add column if not exists id uuid default gen_random_uuid() not null;
alter table public.profile_portfolio_items add column if not exists user_id uuid not null;
alter table public.profile_portfolio_items add column if not exists title text not null;
alter table public.profile_portfolio_items add column if not exists description text default ''::text not null;
alter table public.profile_portfolio_items add column if not exists url text;
alter table public.profile_portfolio_items add column if not exists image_url text;
alter table public.profile_portfolio_items add column if not exists "position" integer default 0 not null;
alter table public.profile_portfolio_items add column if not exists created_at timestamp with time zone default now() not null;
alter table public.profile_portfolio_items add column if not exists updated_at timestamp with time zone default now() not null;

create table if not exists public.profile_projects (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text not null,
  description text default ''::text not null,
  url text,
  image_url text,
  "position" integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_projects_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.profile_projects add column if not exists id uuid default gen_random_uuid() not null;
alter table public.profile_projects add column if not exists user_id uuid not null;
alter table public.profile_projects add column if not exists title text not null;
alter table public.profile_projects add column if not exists description text default ''::text not null;
alter table public.profile_projects add column if not exists url text;
alter table public.profile_projects add column if not exists image_url text;
alter table public.profile_projects add column if not exists "position" integer default 0 not null;
alter table public.profile_projects add column if not exists created_at timestamp with time zone default now() not null;
alter table public.profile_projects add column if not exists updated_at timestamp with time zone default now() not null;

create table if not exists public.profile_privacy_settings (
  user_id uuid not null,
  analytics_visibility text default 'private'::text not null,
  activity_visibility text default 'public'::text not null,
  contact_visibility text default 'connections'::text not null,
  updated_at timestamp with time zone default now() not null,
  constraint profile_privacy_settings_activity_visibility_check CHECK ((activity_visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text]))),
  constraint profile_privacy_settings_analytics_visibility_check CHECK ((analytics_visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text]))),
  constraint profile_privacy_settings_contact_visibility_check CHECK ((contact_visibility = ANY (ARRAY['public'::text, 'connections'::text, 'private'::text]))),
  constraint profile_privacy_settings_pkey PRIMARY KEY (user_id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.profile_privacy_settings add column if not exists user_id uuid not null;
alter table public.profile_privacy_settings add column if not exists analytics_visibility text default 'private'::text not null;
alter table public.profile_privacy_settings add column if not exists activity_visibility text default 'public'::text not null;
alter table public.profile_privacy_settings add column if not exists contact_visibility text default 'connections'::text not null;
alter table public.profile_privacy_settings add column if not exists updated_at timestamp with time zone default now() not null;

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

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('profile_links', 'profile_links_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('profile_portfolio_items', 'profile_portfolio_items_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('profile_privacy_settings', 'profile_privacy_settings_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('profile_projects', 'profile_projects_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('universal_profiles', 'universal_profiles_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE')
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

CREATE INDEX IF NOT EXISTS profile_links_user_position_idx ON public.profile_links USING btree (user_id, "position");
CREATE INDEX IF NOT EXISTS profile_portfolio_user_position_idx ON public.profile_portfolio_items USING btree (user_id, "position");
CREATE INDEX IF NOT EXISTS profile_projects_user_position_idx ON public.profile_projects USING btree (user_id, "position");

alter table public.universal_profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.profile_portfolio_items enable row level security;
alter table public.profile_projects enable row level security;
alter table public.profile_privacy_settings enable row level security;

drop policy if exists "universal profiles owner write" on public.universal_profiles;
create policy "universal profiles owner write" on public.universal_profiles for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "universal profiles public read" on public.universal_profiles;
create policy "universal profiles public read" on public.universal_profiles for select to authenticated
  using (true);

drop policy if exists "profile owner delete" on public.profile_links;
create policy "profile owner delete" on public.profile_links for delete to public
  using (auth.uid() = user_id);

drop policy if exists "profile owner insert" on public.profile_links;
create policy "profile owner insert" on public.profile_links for insert to public
  with check (auth.uid() = user_id);

drop policy if exists "profile owner update" on public.profile_links;
create policy "profile owner update" on public.profile_links for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile public read" on public.profile_links;
create policy "profile public read" on public.profile_links for select to public
  using (true);

drop policy if exists "profile owner delete" on public.profile_portfolio_items;
create policy "profile owner delete" on public.profile_portfolio_items for delete to public
  using (auth.uid() = user_id);

drop policy if exists "profile owner insert" on public.profile_portfolio_items;
create policy "profile owner insert" on public.profile_portfolio_items for insert to public
  with check (auth.uid() = user_id);

drop policy if exists "profile owner update" on public.profile_portfolio_items;
create policy "profile owner update" on public.profile_portfolio_items for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile public read" on public.profile_portfolio_items;
create policy "profile public read" on public.profile_portfolio_items for select to public
  using (true);

drop policy if exists "profile owner delete" on public.profile_projects;
create policy "profile owner delete" on public.profile_projects for delete to public
  using (auth.uid() = user_id);

drop policy if exists "profile owner insert" on public.profile_projects;
create policy "profile owner insert" on public.profile_projects for insert to public
  with check (auth.uid() = user_id);

drop policy if exists "profile owner update" on public.profile_projects;
create policy "profile owner update" on public.profile_projects for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile public read" on public.profile_projects;
create policy "profile public read" on public.profile_projects for select to public
  using (true);

drop policy if exists "privacy settings owner insert" on public.profile_privacy_settings;
create policy "privacy settings owner insert" on public.profile_privacy_settings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "privacy settings owner update" on public.profile_privacy_settings;
create policy "privacy settings owner update" on public.profile_privacy_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "privacy settings public read" on public.profile_privacy_settings;
create policy "privacy settings public read" on public.profile_privacy_settings for select to authenticated
  using (true);

drop trigger if exists profile_portfolio_touch on public.profile_portfolio_items;
create trigger profile_portfolio_touch BEFORE UPDATE ON public.profile_portfolio_items FOR EACH ROW EXECUTE FUNCTION public.touch_profile_details();

drop trigger if exists profile_projects_touch on public.profile_projects;
create trigger profile_projects_touch BEFORE UPDATE ON public.profile_projects FOR EACH ROW EXECUTE FUNCTION public.touch_profile_details();
