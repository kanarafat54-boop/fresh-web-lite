-- Remove unused table-level privileges from browser roles on the private Fresh ID users table.
-- RLS still limits authenticated SELECT to the caller's own row.
revoke delete, truncate, references, trigger on table public.users from public, anon, authenticated;
revoke select on table public.users from public, anon;
revoke insert, update on table public.users from public, anon, authenticated;

grant select on table public.users to authenticated;
grant insert (id, username, email, full_name, preferences) on table public.users to authenticated;
grant update (username, full_name, preferences, identity, updated_at) on table public.users to authenticated;

notify pgrst, 'reload schema';
