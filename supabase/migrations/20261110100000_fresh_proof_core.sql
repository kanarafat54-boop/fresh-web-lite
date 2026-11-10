-- Fresh Proof core: an append-only, hash-chained public record of claims, predictions, promises,
-- provenance statements and automated actions.
--
-- What this gives: every record is timestamped by the database (never by the client), numbered per author, and
-- linked to that author's previous record by a SHA-256 hash. Anyone can re-compute the chain outside Fresh and
-- detect an edited, removed or re-ordered record. What it does NOT give: protection against whoever controls the
-- database. Publishing proof_daily_digest() somewhere the operator does not control closes that gap (see docs).
--
-- Additive: one new table, trigger functions and two read helpers. Nothing existing is changed.

create table if not exists public.proof_records (
  id uuid primary key default gen_random_uuid(),
  -- No foreign key on purpose: deleting an account must not be blocked, and the record keeps only the id.
  author_id uuid not null,
  seq bigint not null,
  kind text not null check (kind in ('claim', 'prediction', 'promise', 'provenance', 'action')),
  subject_type text check (subject_type is null or char_length(subject_type) <= 40),
  subject_id text check (subject_id is null or char_length(subject_id) <= 120),
  -- Canonical JSON text written by the client; hashed exactly as stored so anyone can recompute it.
  body_json text not null check (char_length(body_json) between 2 and 4000),
  created_at timestamptz not null default clock_timestamp(),
  created_at_text text not null default '',
  prev_hash text not null default '',
  record_hash text not null default '',
  unique (author_id, seq)
);

create index if not exists proof_records_created_idx on public.proof_records (created_at);
create index if not exists proof_records_subject_idx on public.proof_records (subject_type, subject_id);

-- The exact text that is hashed. Kept in one function so insert and verification cannot drift apart.
create or replace function public.proof_hash_input(
  p_prev_hash text, p_author uuid, p_seq bigint, p_kind text, p_subject_type text, p_subject_id text,
  p_created_text text, p_body text
) returns text
language sql immutable
as $$
  select p_prev_hash || '|' || p_author::text || '|' || p_seq::text || '|' || p_kind || '|' ||
         coalesce(p_subject_type, '') || '|' || coalesce(p_subject_id, '') || '|' || p_created_text || '|' || p_body
$$;

create or replace function public.proof_records_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_row public.proof_records%rowtype;
begin
  -- A signed-in client can only write as itself.
  if auth.uid() is not null then
    new.author_id := auth.uid();
  end if;
  if new.author_id is null then
    raise exception 'proof record needs an author';
  end if;

  -- The body must be valid JSON; the text itself is what gets hashed.
  begin
    perform new.body_json::jsonb;
  exception when others then
    raise exception 'proof record body must be valid JSON';
  end;

  -- One writer at a time per author, so the chain has no gaps or forks.
  perform pg_advisory_xact_lock(hashtextextended(new.author_id::text, 0));
  select * into last_row from public.proof_records where author_id = new.author_id order by seq desc limit 1;

  new.seq := coalesce(last_row.seq, 0) + 1;
  new.prev_hash := coalesce(last_row.record_hash, repeat('0', 64));
  new.created_at := clock_timestamp();
  new.created_at_text := to_char(new.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  new.record_hash := encode(sha256(convert_to(public.proof_hash_input(
    new.prev_hash, new.author_id, new.seq, new.kind, new.subject_type, new.subject_id, new.created_at_text, new.body_json
  ), 'UTF8')), 'hex');
  return new;
end;
$$;

drop trigger if exists proof_records_before_insert on public.proof_records;
create trigger proof_records_before_insert before insert on public.proof_records
  for each row execute function public.proof_records_before_insert();

create or replace function public.proof_records_refuse_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'proof records are append-only';
end;
$$;

drop trigger if exists proof_records_no_update on public.proof_records;
create trigger proof_records_no_update before update on public.proof_records
  for each row execute function public.proof_records_refuse_change();
drop trigger if exists proof_records_no_delete on public.proof_records;
create trigger proof_records_no_delete before delete on public.proof_records
  for each row execute function public.proof_records_refuse_change();
drop trigger if exists proof_records_no_truncate on public.proof_records;
create trigger proof_records_no_truncate before truncate on public.proof_records
  for each statement execute function public.proof_records_refuse_change();

alter table public.proof_records enable row level security;
drop policy if exists "Proof records are public" on public.proof_records;
create policy "Proof records are public" on public.proof_records for select using (true);
drop policy if exists "Users write their own proof records" on public.proof_records;
create policy "Users write their own proof records" on public.proof_records for insert to authenticated
  with check (author_id = auth.uid());

revoke all on public.proof_records from anon, authenticated;
grant select on public.proof_records to anon, authenticated;
grant insert (kind, subject_type, subject_id, body_json) on public.proof_records to authenticated;

-- Re-computes one author's chain inside the database. ok = false names the first broken record.
create or replace function public.proof_verify_chain(p_author uuid)
returns table (ok boolean, checked bigint, broken_seq bigint)
language plpgsql
stable
as $$
declare
  r public.proof_records%rowtype;
  expected_prev text := repeat('0', 64);
  expected_seq bigint := 1;
  n bigint := 0;
begin
  for r in select * from public.proof_records where author_id = p_author order by seq loop
    if r.seq <> expected_seq or r.prev_hash <> expected_prev or r.record_hash <> encode(sha256(convert_to(public.proof_hash_input(
      r.prev_hash, r.author_id, r.seq, r.kind, r.subject_type, r.subject_id, r.created_at_text, r.body_json
    ), 'UTF8')), 'hex') then
      return query select false, n, r.seq;
      return;
    end if;
    expected_prev := r.record_hash;
    expected_seq := expected_seq + 1;
    n := n + 1;
  end loop;
  return query select true, n, null::bigint;
end;
$$;

-- One digest for a UTC day: SHA-256 over that day's record hashes in a fixed order. Publish it somewhere the operator
-- does not control (a public log, another organisation, a newspaper) and rewriting that day later becomes detectable.
create or replace function public.proof_daily_digest(p_day date)
returns table (day date, records bigint, digest text)
language sql
stable
as $$
  select p_day,
         count(*),
         encode(sha256(convert_to(coalesce(string_agg(record_hash, '' order by author_id, seq), ''), 'UTF8')), 'hex')
  from public.proof_records
  where created_at >= (p_day::timestamp at time zone 'UTC') and created_at < ((p_day + 1)::timestamp at time zone 'UTC')
$$;

grant execute on function public.proof_verify_chain(uuid) to anon, authenticated;
grant execute on function public.proof_daily_digest(date) to anon, authenticated;
