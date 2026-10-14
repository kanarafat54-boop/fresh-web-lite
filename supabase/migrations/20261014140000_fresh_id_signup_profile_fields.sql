-- Fresh ID registration profile fields.
-- Birth date is private account data; expose it only through the owner's profile policies.
alter table public.users
  add column if not exists date_of_birth date,
  add column if not exists country text,
  add column if not exists gender text,
  add column if not exists signup_consent_version text,
  add column if not exists signup_consent_at timestamptz;

alter table public.users
  drop constraint if exists users_gender_check;
alter table public.users
  add constraint users_gender_check
  check (gender is null or gender in ('woman', 'man', 'non_binary', 'self_described'));

-- Extend the explicit least-privilege signup insert grant from the existing
-- Fresh ID profile-column boundary migration.
revoke insert, update on table public.users from public, anon, authenticated;
grant insert (id, username, email, full_name, preferences, date_of_birth, country, gender, signup_consent_version, signup_consent_at)
  on table public.users to authenticated;
grant update (username, full_name, preferences, identity, updated_at)
  on table public.users to authenticated;

-- The entered username is the public handle, so enforce case-insensitive uniqueness.
-- Existing duplicate values must be reconciled before this migration can be applied.
create unique index if not exists users_username_lower_unique
  on public.users (lower(username))
  where username is not null and btrim(username) <> '';

notify pgrst, 'reload schema';
