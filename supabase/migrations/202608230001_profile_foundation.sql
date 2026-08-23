-- Fresh Web Lite profile foundation
-- Keeps public profile presentation separate from the authentication users row.

create table if not exists public.profile_details (
  user_id uuid primary key references public.users(id) on delete cascade,
  bio text not null default '',
  avatar_url text,
  cover_url text,
  location text,
  website_url text,
  occupation text,
  company text,
  pronouns text,
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  url text,
  image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  url text,
  image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_links_user_position_idx on public.profile_links(user_id, position);
create index if not exists profile_projects_user_position_idx on public.profile_projects(user_id, position);
create index if not exists profile_portfolio_user_position_idx on public.profile_portfolio_items(user_id, position);

alter table public.profile_details enable row level security;
alter table public.profile_links enable row level security;
alter table public.profile_projects enable row level security;
alter table public.profile_portfolio_items enable row level security;

-- Public profiles are readable; private profile_details are restricted to the owner.
drop policy if exists "profile details public read" on public.profile_details;
create policy "profile details public read" on public.profile_details
  for select using (visibility = 'public' or auth.uid() = user_id);

drop policy if exists "profile details owner insert" on public.profile_details;
create policy "profile details owner insert" on public.profile_details
  for insert with check (auth.uid() = user_id);

drop policy if exists "profile details owner update" on public.profile_details;
create policy "profile details owner update" on public.profile_details
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profile details owner delete" on public.profile_details;
create policy "profile details owner delete" on public.profile_details
  for delete using (auth.uid() = user_id);

-- Links, projects and portfolio entries are public to read and owner-managed.
create or replace function public.profile_owner_read_write_policy(table_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  execute format('drop policy if exists "profile public read" on public.%I', table_name);
  execute format('create policy "profile public read" on public.%I for select using (true)', table_name);
  execute format('drop policy if exists "profile owner insert" on public.%I', table_name);
  execute format('create policy "profile owner insert" on public.%I for insert with check (auth.uid() = user_id)', table_name);
  execute format('drop policy if exists "profile owner update" on public.%I', table_name);
  execute format('create policy "profile owner update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
  execute format('drop policy if exists "profile owner delete" on public.%I', table_name);
  execute format('create policy "profile owner delete" on public.%I for delete using (auth.uid() = user_id)', table_name);
end;
$$;

select public.profile_owner_read_write_policy('profile_links');
select public.profile_owner_read_write_policy('profile_projects');
select public.profile_owner_read_write_policy('profile_portfolio_items');
drop function public.profile_owner_read_write_policy(text);

create or replace function public.touch_profile_details() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profile_details_touch on public.profile_details;
create trigger profile_details_touch before update on public.profile_details
for each row execute function public.touch_profile_details();

drop trigger if exists profile_projects_touch on public.profile_projects;
create trigger profile_projects_touch before update on public.profile_projects
for each row execute function public.touch_profile_details();

drop trigger if exists profile_portfolio_touch on public.profile_portfolio_items;
create trigger profile_portfolio_touch before update on public.profile_portfolio_items
for each row execute function public.touch_profile_details();
