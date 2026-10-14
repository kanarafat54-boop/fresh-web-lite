-- Fresh ID registration profile fields.
-- Birth date is private account data; expose it only through the owner's profile policies.
alter table public.users
  add column if not exists date_of_birth date,
  add column if not exists country text,
  add column if not exists gender text;

alter table public.users
  drop constraint if exists users_gender_check;
alter table public.users
  add constraint users_gender_check
  check (gender is null or gender in ('woman', 'man', 'non_binary', 'self_described'));

-- Extend the explicit least-privilege signup insert grant from the existing
-- Fresh ID profile-column boundary migration.
revoke insert, update on table public.users from public, anon, authenticated;
grant insert (id, username, email, full_name, preferences, date_of_birth, country, gender)
  on table public.users to authenticated;
grant update (username, full_name, preferences, identity, updated_at)
  on table public.users to authenticated;

notify pgrst, 'reload schema';
