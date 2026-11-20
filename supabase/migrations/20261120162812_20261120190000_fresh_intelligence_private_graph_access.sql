-- Fresh Intelligence research graph is server-managed.
-- Search queries and synthesized claims can contain sensitive user intent.
-- Browser roles must not read or mutate the shared graph; server-side service_role
-- access remains available to the research persistence adapter.
do $$
declare
  item record;
begin
  for item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'fresh_intelligence_sources',
        'fresh_intelligence_claims',
        'fresh_intelligence_evidence',
        'fresh_intelligence_claim_evidence',
        'fresh_intelligence_claim_relations',
        'fresh_intelligence_arbitrations',
        'fresh_intelligence_claim_revisions',
        'fresh_intelligence_entities'
      ])
      and roles && array['anon'::name, 'authenticated'::name]
  loop
    execute format('drop policy if exists %I on %I.%I', item.policyname, item.schemaname, item.tablename);
  end loop;
end;
$$;

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
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all privileges on table public.%I to service_role', table_name);
  end loop;
end;
$$;
