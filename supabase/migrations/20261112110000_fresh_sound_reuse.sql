-- Fresh Shorts: "Use this sound" (spec Part 5). A new Short may credit an existing Short as the source of its sound.
--
--   * shorts.sound_source_short_id: the Short the sound was taken from. Nullable; ON DELETE SET NULL keeps the new
--     Short if the original is deleted (the sound_name stays as text).
--   * A BEFORE INSERT trigger refuses reuse when the original creator turned sound reuse off
--     (short_privacy_settings.sound_reuse_allowed) or has blocked the person reusing it. Reusing your own sound is
--     always allowed. Server roles (auth.uid() is null) are not restricted.
--   * If the new Short does not set a sound_name, it takes the source's, so the credit and the Sound page line up.
--
-- Additive. Needs 20261111120000_fresh_shorts_privacy_controls.sql applied first. Also pins the search_path of the
-- keyword-validation helper that migration created (flagged by the security advisor).

alter function public.short_keywords_valid(text[]) set search_path = public;

alter table public.shorts add column if not exists sound_source_short_id uuid references public.shorts (id) on delete set null;
create index if not exists shorts_sound_source_idx on public.shorts (sound_source_short_id) where sound_source_short_id is not null;

create or replace function public.guard_short_sound_reuse()
returns trigger language plpgsql security definer set search_path = public
as $$
declare src record;
begin
  if new.sound_source_short_id is null or auth.uid() is null then return new; end if;
  select author_id, sound_name into src from public.shorts where id = new.sound_source_short_id;
  if src.author_id is null then
    raise exception 'The original Short for this sound was not found.' using errcode = 'P0002';
  end if;
  if src.author_id <> new.author_id then
    if not public.short_sound_reuse_allowed(src.author_id) then
      raise exception 'The creator does not allow others to use this sound.' using errcode = '42501';
    end if;
    if public.has_blocked(src.author_id, new.author_id) then
      raise exception 'You can''t use this sound.' using errcode = '42501';
    end if;
  end if;
  if new.sound_name is null or btrim(new.sound_name) = '' then new.sound_name := src.sound_name; end if;
  return new;
end;
$$;
revoke all on function public.guard_short_sound_reuse() from public, anon, authenticated;
drop trigger if exists guard_short_sound_reuse on public.shorts;
create trigger guard_short_sound_reuse before insert on public.shorts
  for each row execute function public.guard_short_sound_reuse();

notify pgrst, 'reload schema';
