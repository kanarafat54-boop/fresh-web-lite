-- Fresh ID multi-account foundation.
-- Account modes are workspace entities; they are deliberately separate from
-- public.users.role, which remains a server-managed security role.

create table if not exists public.fresh_id_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  account_type text not null check (account_type in ('creator', 'business', 'developer', 'organization')),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  slug text,
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fresh_id_accounts_slug_format check (
    slug is null or slug ~ '^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$'
  )
);

create unique index if not exists fresh_id_accounts_slug_unique
  on public.fresh_id_accounts (lower(slug))
  where slug is not null;

create index if not exists fresh_id_accounts_owner_created_idx
  on public.fresh_id_accounts (owner_user_id, created_at desc);

create table if not exists public.fresh_id_account_memberships (
  account_id uuid not null references public.fresh_id_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null check (membership_role in ('owner', 'admin', 'member', 'billing_manager')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index if not exists fresh_id_memberships_user_status_idx
  on public.fresh_id_account_memberships (user_id, status, created_at desc);

alter table public.fresh_id_accounts enable row level security;
alter table public.fresh_id_account_memberships enable row level security;

revoke all privileges on table public.fresh_id_accounts from public, anon, authenticated;
revoke all privileges on table public.fresh_id_account_memberships from public, anon, authenticated;

grant select on table public.fresh_id_accounts to authenticated;
grant select on table public.fresh_id_account_memberships to authenticated;

drop policy if exists fresh_id_accounts_member_read on public.fresh_id_accounts;
create policy fresh_id_accounts_member_read
  on public.fresh_id_accounts
  for select
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    or exists (
      select 1
      from public.fresh_id_account_memberships membership
      where membership.account_id = id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    )
  );

drop policy if exists fresh_id_memberships_self_or_owner_read on public.fresh_id_account_memberships;
create policy fresh_id_memberships_self_or_owner_read
  on public.fresh_id_account_memberships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.fresh_id_accounts account
      where account.id = account_id
        and account.owner_user_id = (select auth.uid())
    )
  );

create or replace function public.create_fresh_id_account(
  p_account_type text,
  p_display_name text,
  p_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_slug text := nullif(lower(btrim(coalesce(p_slug, ''))), '');
begin
  if v_user_id is null then
    raise exception 'Fresh ID sign-in is required'
      using errcode = '42501';
  end if;

  if p_account_type not in ('creator', 'business', 'developer', 'organization') then
    raise exception 'Unsupported Fresh account type'
      using errcode = '22023';
  end if;

  if char_length(v_display_name) < 2 or char_length(v_display_name) > 120 then
    raise exception 'Account display name must be between 2 and 120 characters'
      using errcode = '22023';
  end if;

  if v_slug is not null and v_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$' then
    raise exception 'Account slug format is invalid'
      using errcode = '22023';
  end if;

  insert into public.fresh_id_accounts (owner_user_id, account_type, display_name, slug)
  values (v_user_id, p_account_type, v_display_name, v_slug)
  returning id into v_account_id;

  insert into public.fresh_id_account_memberships (account_id, user_id, membership_role, status)
  values (v_account_id, v_user_id, 'owner', 'active');

  return v_account_id;
end;
$function$;

revoke all on function public.create_fresh_id_account(text, text, text) from public, anon;
grant execute on function public.create_fresh_id_account(text, text, text) to authenticated;

comment on table public.fresh_id_accounts is
  'Fresh ID-owned creator, business, developer, and organization workspaces; distinct from authentication identities and privileged platform roles.';
comment on table public.fresh_id_account_memberships is
  'Membership and workspace-scoped roles for Fresh ID accounts. Membership writes are server/RPC controlled.';
