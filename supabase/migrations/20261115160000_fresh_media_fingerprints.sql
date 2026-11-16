-- Origin verification for Fresh Shorts: a file fingerprint, registered by the server.
--
-- When a Short is published, the server downloads the media it points at, computes its SHA-256 and records it here
-- with the database clock, and writes a matching "fingerprint" record into the Fresh Proof chain. Anyone can then hash a
-- file themselves and ask who registered an identical file first.
--
-- What this proves: these exact bytes were first registered on Fresh by this account at this time.
-- What it does not prove: who made the file, or that a re-encoded or edited copy comes from the same source
-- (any change to the bytes changes the fingerprint). Signed content credentials are not part of this.
-- Additive. Clients can read fingerprints and look files up; only the server writes them.

do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.proof_records'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%' loop
    execute format('alter table public.proof_records drop constraint %I', c);
  end loop;
end;
$$;
alter table public.proof_records add constraint proof_records_kind_check check (kind in ('claim', 'prediction', 'promise', 'provenance', 'action', 'fingerprint'));

-- A signed-in client may not write a fingerprint record: only the server registers fingerprints.
drop policy if exists "Users write their own proof records" on public.proof_records;
create policy "Users write their own proof records" on public.proof_records for insert to authenticated
  with check (author_id = auth.uid() and kind <> 'fingerprint');

create table if not exists public.short_media_fingerprints (
  short_id uuid primary key,
  author_id uuid not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes bigint not null check (size_bytes > 0),
  registered_at timestamptz not null default clock_timestamp(),
  proof_seq bigint,
  proof_hash text
);
create index if not exists short_media_fingerprints_hash_idx on public.short_media_fingerprints (sha256, registered_at);
alter table public.short_media_fingerprints enable row level security;
drop policy if exists "Fingerprints are public" on public.short_media_fingerprints;
create policy "Fingerprints are public" on public.short_media_fingerprints for select using (true);
revoke all on public.short_media_fingerprints from anon, authenticated;
grant select on public.short_media_fingerprints to anon, authenticated;

-- Who registered this exact file, earliest first.
create or replace function public.fingerprint_matches(p_sha256 text)
returns table (short_id uuid, author_id uuid, username text, registered_at timestamptz, is_first boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select f.short_id, f.author_id, p.username, f.registered_at,
         (f.registered_at = min(f.registered_at) over ()) as is_first
  from public.short_media_fingerprints f
  left join public.user_public_profiles p on p.id = f.author_id
  where p_sha256 ~ '^[0-9a-f]{64}$' and f.sha256 = p_sha256
  order by f.registered_at asc
  limit 20
$$;
revoke all on function public.fingerprint_matches(text) from public;
grant execute on function public.fingerprint_matches(text) to anon, authenticated;
