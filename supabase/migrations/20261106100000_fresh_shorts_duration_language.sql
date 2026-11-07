-- Fresh Shorts: record duration and language when a Short is published (spec 2.1 filters). Additive only.
-- Existing Shorts keep null in both columns; the app treats null as "unknown" and never guesses.
-- Apply after schema review. Rollback: drop the two columns (no other object depends on them).

alter table public.shorts
  add column if not exists duration_seconds numeric(8, 2),
  add column if not exists language text;

do $$
begin
  alter table public.shorts
    add constraint shorts_duration_seconds_check check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 36000));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.shorts
    add constraint shorts_language_check check (language is null or language ~ '^[a-z]{2,3}$');
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
