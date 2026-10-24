-- Fresh web index write path (slice 2). Additive; depends on 20261024090000_fresh_web_index_foundation.sql.
-- Server-only (service_role). upsert is atomic: a document, its version row and its passages
-- change together or not at all, which PostgREST table calls from the client cannot guarantee.

create or replace function public.upsert_fresh_web_document(p jsonb)
returns jsonb
language plpgsql security invoker set search_path to 'public'
as $function$
declare
  v_url text := p->>'canonical_url';
  v_hash text := p->>'content_hash';
  v_fetched timestamptz := coalesce((p->>'fetched_at')::timestamptz, now());
  v_doc public.fresh_web_documents%rowtype;
  v_version integer;
  v_status text;
begin
  if v_url is null or v_url !~ '^https?://' then raise exception 'invalid canonical_url' using errcode = '22023'; end if;
  if v_hash is null or v_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid content_hash' using errcode = '22023'; end if;
  if jsonb_typeof(p->'passages') is distinct from 'array' or jsonb_array_length(p->'passages') = 0 then
    raise exception 'passages must be a non-empty array' using errcode = '22023';
  end if;

  select * into v_doc from public.fresh_web_documents where canonical_url = v_url for update;
  if found and v_doc.status = 'indexed' and v_doc.content_hash = v_hash then
    update public.fresh_web_documents set last_fetched_at = v_fetched where id = v_doc.id;
    return jsonb_build_object('document_id', v_doc.id, 'version', v_doc.current_version, 'status', 'unchanged');
  end if;

  if found then
    v_version := v_doc.current_version + 1;
    update public.fresh_web_documents set
      title = coalesce(p->>'title', ''), language = nullif(p->>'language', ''),
      published_at = nullif(p->>'published_at', '')::timestamptz, status = 'indexed', removed_at = null,
      current_version = v_version, content_hash = v_hash, last_fetched_at = v_fetched,
      host = coalesce(nullif(p->>'host', ''), host)
    where id = v_doc.id;
  else
    v_version := 1;
    insert into public.fresh_web_documents (canonical_url, host, title, language, published_at, content_hash, current_version, last_fetched_at)
    values (v_url, coalesce(nullif(p->>'host', ''), 'unknown'), coalesce(p->>'title', ''), nullif(p->>'language', ''),
            nullif(p->>'published_at', '')::timestamptz, v_hash, 1, v_fetched)
    returning * into v_doc;
  end if;
  v_status := 'indexed';

  insert into public.fresh_web_document_versions (document_id, version, content_hash, fetched_at, etag, last_modified)
  values (v_doc.id, v_version, v_hash, v_fetched, p->>'etag', p->>'last_modified');
  delete from public.fresh_web_passages where document_id = v_doc.id;
  insert into public.fresh_web_passages (document_id, version, ordinal, body)
  select v_doc.id, v_version, (e->>'ordinal')::integer, e->>'text'
  from jsonb_array_elements(p->'passages') e
  where length(trim(coalesce(e->>'text', ''))) > 0;

  return jsonb_build_object('document_id', v_doc.id, 'version', v_version, 'status', v_status);
end;
$function$;

create or replace function public.mark_fresh_web_document_removed(p_url text)
returns boolean
language plpgsql security invoker set search_path to 'public'
as $function$
declare v_id uuid;
begin
  update public.fresh_web_documents set status = 'removed', removed_at = now()
  where canonical_url = p_url and status = 'indexed' returning id into v_id;
  if v_id is null then return false; end if;
  delete from public.fresh_web_passages where document_id = v_id;
  return true;
end;
$function$;

create or replace function public.fresh_web_index_stats()
returns jsonb
language sql stable security invoker set search_path to 'public'
as $function$
  select jsonb_build_object(
    'documents', (select count(*) from public.fresh_web_documents where status = 'indexed'),
    'passages', (select count(*) from public.fresh_web_passages));
$function$;

revoke all on function public.upsert_fresh_web_document(jsonb), public.mark_fresh_web_document_removed(text), public.fresh_web_index_stats() from public, anon, authenticated;
grant execute on function public.upsert_fresh_web_document(jsonb), public.mark_fresh_web_document_removed(text), public.fresh_web_index_stats() to service_role;
