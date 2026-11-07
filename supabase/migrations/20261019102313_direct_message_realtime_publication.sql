-- Add direct_messages to the Supabase Realtime publication if needed.
-- Realtime transports events only; existing row-level security remains the authorization boundary.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'direct_messages'
     ) then
    execute 'alter publication supabase_realtime add table public.direct_messages';
  end if;
end
$$;
