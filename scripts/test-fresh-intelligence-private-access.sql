-- Run only against the disposable PostgreSQL integration database.
do $$
declare
  table_name text;
  research_tables text[] := array[
    'fresh_intelligence_sources',
    'fresh_intelligence_claims',
    'fresh_intelligence_evidence',
    'fresh_intelligence_claim_evidence',
    'fresh_intelligence_claim_relations',
    'fresh_intelligence_arbitrations',
    'fresh_intelligence_claim_revisions',
    'fresh_intelligence_entities'
  ];
begin
  foreach table_name in array research_tables loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relrowsecurity
    ) then
      raise exception 'RLS must remain enabled on public.%', table_name;
    end if;

    if has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
       or has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
       or has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
       or has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
       or has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
       or has_table_privilege('anon', format('public.%I', table_name), 'TRUNCATE')
       or has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE') then
      raise exception 'Browser role still has direct privileges on public.%', table_name;
    end if;

    if not has_table_privilege('service_role', format('public.%I', table_name), 'SELECT')
       or not has_table_privilege('service_role', format('public.%I', table_name), 'INSERT')
       or not has_table_privilege('service_role', format('public.%I', table_name), 'UPDATE')
       or not has_table_privilege('service_role', format('public.%I', table_name), 'DELETE') then
      raise exception 'Server service_role lost required access to public.%', table_name;
    end if;

    if exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and roles && array['anon'::name, 'authenticated'::name]
    ) then
      raise exception 'Browser-facing RLS policy remains on public.%', table_name;
    end if;
  end loop;
end;
$$;

select 'Fresh Intelligence private graph access: PASS' as result;
