// The film plan: scenes and shots for a multi-scene project, kept inside the timeline document so it is
// saved, versioned and undone with everything else. The shape follows the existing Director production
// desk (scene title, location, time of day; shot framing, movement, duration). A shot can be linked to a
// clip on the main video track; "sequence" then lays those clips out in film order.
import type { TimelineClip, TimelineDoc } from "./timeline.ts";
import { TimelineError, baseVideoTrack, clipDuration, newId, round3 } from "./timeline.ts";

export type FilmShot = { id: string; title: string; framing: string; movement: string; /** Planned length in seconds. */ duration: number; notes: string; /** The clip that is this shot, if one has been linked. */ clipId?: string };
export type FilmScene = { id: string; title: string; location: string; timeOfDay: string; description: string; shots: FilmShot[] };
export type FilmPlan = { scenes: FilmScene[] };

export const FRAMINGS = ["Wide", "Medium", "Close-up", "Extreme close-up", "Over the shoulder", "Aerial"] as const;
export const MOVEMENTS = ["Static", "Pan", "Tilt", "Dolly", "Tracking", "Handheld", "Crane"] as const;
export const TIMES_OF_DAY = ["Day", "Dawn", "Dusk", "Night", "Interior"] as const;
export const MAX_SCENES = 40;
export const MAX_SHOTS_PER_SCENE = 30;
export const MAX_SHOT_SECONDS = 600;
const TEXT_MAX = 200, NOTES_MAX = 2000;

const plan = (doc: TimelineDoc): FilmPlan => doc.film ?? { scenes: [] };
const withPlan = (doc: TimelineDoc, scenes: FilmScene[]): TimelineDoc => ({ ...doc, film: { scenes } });
const clean = (s: unknown, max: number, fallback = "") => (typeof s === "string" ? s.trim().slice(0, max) : fallback);
const sceneOf = (doc: TimelineDoc, id: string) => { const s = plan(doc).scenes.find((x) => x.id === id); if (!s) throw new TimelineError("That scene no longer exists."); return s; };
const locate = (doc: TimelineDoc, shotId: string) => {
  for (const s of plan(doc).scenes) { const i = s.shots.findIndex((x) => x.id === shotId); if (i >= 0) return { scene: s, index: i, shot: s.shots[i] }; }
  throw new TimelineError("That shot no longer exists.");
};
const mapScene = (doc: TimelineDoc, id: string, fn: (s: FilmScene) => FilmScene) => withPlan(doc, plan(doc).scenes.map((s) => (s.id === id ? fn(s) : s)));

export function addScene(doc: TimelineDoc, input: Partial<Omit<FilmScene, "shots">> & { id?: string } = {}): TimelineDoc {
  const scenes = plan(doc).scenes;
  if (scenes.length >= MAX_SCENES) throw new TimelineError(`A film can have up to ${MAX_SCENES} scenes.`);
  const scene: FilmScene = {
    id: input.id ?? newId("scene"), title: clean(input.title, TEXT_MAX) || `Scene ${scenes.length + 1}`, location: clean(input.location, TEXT_MAX, "Unspecified location") || "Unspecified location",
    timeOfDay: clean(input.timeOfDay, 40, "Day") || "Day", description: clean(input.description, NOTES_MAX), shots: [],
  };
  return withPlan(doc, [...scenes, scene]);
}
export function updateScene(doc: TimelineDoc, id: string, patch: Partial<Omit<FilmScene, "id" | "shots">>): TimelineDoc {
  sceneOf(doc, id);
  return mapScene(doc, id, (s) => ({
    ...s,
    title: patch.title !== undefined ? clean(patch.title, TEXT_MAX) || s.title : s.title,
    location: patch.location !== undefined ? clean(patch.location, TEXT_MAX) || s.location : s.location,
    timeOfDay: patch.timeOfDay !== undefined ? clean(patch.timeOfDay, 40) || s.timeOfDay : s.timeOfDay,
    description: patch.description !== undefined ? clean(patch.description, NOTES_MAX) : s.description,
  }));
}
export function removeScene(doc: TimelineDoc, id: string): TimelineDoc { sceneOf(doc, id); return withPlan(doc, plan(doc).scenes.filter((s) => s.id !== id)); }
export function moveScene(doc: TimelineDoc, id: string, delta: -1 | 1): TimelineDoc {
  const scenes = [...plan(doc).scenes];
  const i = scenes.findIndex((s) => s.id === id);
  if (i < 0) throw new TimelineError("That scene no longer exists.");
  const j = i + delta;
  if (j < 0 || j >= scenes.length) return doc;
  [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  return withPlan(doc, scenes);
}

export function addShot(doc: TimelineDoc, sceneId: string, input: Partial<Omit<FilmShot, "clipId">> & { id?: string } = {}): TimelineDoc {
  const scene = sceneOf(doc, sceneId);
  if (scene.shots.length >= MAX_SHOTS_PER_SCENE) throw new TimelineError(`A scene can have up to ${MAX_SHOTS_PER_SCENE} shots.`);
  const duration = input.duration === undefined ? 4 : input.duration;
  if (!Number.isFinite(duration) || duration < 0.5 || duration > MAX_SHOT_SECONDS) throw new TimelineError(`A shot's planned length must be between 0.5 and ${MAX_SHOT_SECONDS} seconds.`);
  const shot: FilmShot = { id: input.id ?? newId("shot"), title: clean(input.title, TEXT_MAX) || `Shot ${scene.shots.length + 1}`, framing: clean(input.framing, 40) || "Medium", movement: clean(input.movement, 40) || "Static", duration: round3(duration), notes: clean(input.notes, NOTES_MAX) };
  return mapScene(doc, sceneId, (s) => ({ ...s, shots: [...s.shots, shot] }));
}
export function updateShot(doc: TimelineDoc, shotId: string, patch: Partial<Omit<FilmShot, "id" | "clipId">>): TimelineDoc {
  const { scene, shot } = locate(doc, shotId);
  if (patch.duration !== undefined && (!Number.isFinite(patch.duration) || patch.duration < 0.5 || patch.duration > MAX_SHOT_SECONDS)) throw new TimelineError(`A shot's planned length must be between 0.5 and ${MAX_SHOT_SECONDS} seconds.`);
  return mapScene(doc, scene.id, (s) => ({
    ...s,
    shots: s.shots.map((x) => (x.id !== shotId ? x : {
      ...shot,
      title: patch.title !== undefined ? clean(patch.title, TEXT_MAX) || shot.title : shot.title,
      framing: patch.framing !== undefined ? clean(patch.framing, 40) || shot.framing : shot.framing,
      movement: patch.movement !== undefined ? clean(patch.movement, 40) || shot.movement : shot.movement,
      duration: patch.duration !== undefined ? round3(patch.duration) : shot.duration,
      notes: patch.notes !== undefined ? clean(patch.notes, NOTES_MAX) : shot.notes,
    })),
  }));
}
export function removeShot(doc: TimelineDoc, shotId: string): TimelineDoc { const { scene } = locate(doc, shotId); return mapScene(doc, scene.id, (s) => ({ ...s, shots: s.shots.filter((x) => x.id !== shotId) })); }
/** Moves a shot up or down inside its scene. */
export function moveShot(doc: TimelineDoc, shotId: string, delta: -1 | 1): TimelineDoc {
  const { scene, index } = locate(doc, shotId);
  const j = index + delta;
  if (j < 0 || j >= scene.shots.length) return doc;
  return mapScene(doc, scene.id, (s) => { const shots = [...s.shots]; [shots[index], shots[j]] = [shots[j], shots[index]]; return { ...s, shots }; });
}

/** The clip a shot points at, if it is still on the main video track. */
export function clipOfShot(doc: TimelineDoc, shot: FilmShot): TimelineClip | undefined {
  if (!shot.clipId) return undefined;
  const base = baseVideoTrack(doc);
  return doc.clips.find((c) => c.id === shot.clipId && base !== null && c.trackId === base.id);
}
/** Links a shot to a clip on the main video track (or clears the link with null). A clip belongs to one shot only. */
export function linkShot(doc: TimelineDoc, shotId: string, clipId: string | null): TimelineDoc {
  const { shot } = locate(doc, shotId);
  if (clipId !== null) {
    const base = baseVideoTrack(doc);
    const clip = doc.clips.find((c) => c.id === clipId);
    if (!clip) throw new TimelineError("That clip no longer exists.");
    if (!base || clip.trackId !== base.id) throw new TimelineError("Only clips on the main video track can be linked to a shot.");
  }
  const scenes = plan(doc).scenes.map((s) => ({ ...s, shots: s.shots.map((x) => {
    if (x.id === shot.id) { const { clipId: _old, ...rest } = x; void _old; return clipId === null ? rest : { ...rest, clipId }; }
    if (clipId !== null && x.clipId === clipId) { const { clipId: _gone, ...rest } = x; void _gone; return rest; }
    return x;
  }) }));
  return withPlan(doc, scenes);
}

/** Every shot in film order with its clip, if it has one. */
export function filmShots(doc: TimelineDoc): Array<{ scene: FilmScene; shot: FilmShot; clip?: TimelineClip }> {
  return plan(doc).scenes.flatMap((scene) => scene.shots.map((shot) => ({ scene, shot, clip: clipOfShot(doc, shot) })));
}

/** Lays the linked clips on the main video track end to end in film order, starting at 0. Clips that are
 *  not linked to any shot follow after the film in their old order. Other tracks are not touched. */
export function sequenceFilm(doc: TimelineDoc): TimelineDoc {
  const base = baseVideoTrack(doc);
  if (!base) throw new TimelineError("There is no main video track.");
  if (base.locked) throw new TimelineError("Unlock the main video track to arrange it.");
  const linked = filmShots(doc).flatMap((x) => (x.clip ? [x.clip] : []));
  if (linked.length === 0) throw new TimelineError("Link at least one shot to a clip first.");
  const ids = new Set(linked.map((c) => c.id));
  const rest = doc.clips.filter((c) => c.trackId === base.id && !ids.has(c.id)).sort((a, b) => a.start - b.start);
  let t = 0;
  const start = new Map<string, number>();
  for (const c of [...linked, ...rest]) { start.set(c.id, round3(t)); t += clipDuration(c); }
  return { ...doc, clips: doc.clips.map((c) => (start.has(c.id) ? { ...c, start: start.get(c.id)! } : c)) };
}

export type FilmSummary = { scenes: number; shots: number; linked: number; plannedSeconds: number; linkedSeconds: number };
export function filmSummary(doc: TimelineDoc): FilmSummary {
  const all = filmShots(doc);
  return { scenes: plan(doc).scenes.length, shots: all.length, linked: all.filter((x) => x.clip).length, plannedSeconds: round3(all.reduce((n, x) => n + x.shot.duration, 0)), linkedSeconds: round3(all.reduce((n, x) => n + (x.clip ? clipDuration(x.clip) : 0), 0)) };
}

export function validateFilm(film: unknown): string[] {
  if (film === undefined) return [];
  if (typeof film !== "object" || film === null || !Array.isArray((film as FilmPlan).scenes)) return ["The film plan is malformed."];
  const scenes = (film as FilmPlan).scenes;
  if (scenes.length > MAX_SCENES) return ["The film has too many scenes."];
  const errors: string[] = [];
  const ids = new Set<string>(), linkedClips = new Set<string>();
  for (const s of scenes) {
    if (!s || typeof s.id !== "string" || typeof s.title !== "string" || typeof s.location !== "string" || typeof s.timeOfDay !== "string" || typeof s.description !== "string" || !Array.isArray(s.shots)) { errors.push("A scene is malformed."); continue; }
    if (ids.has(s.id)) errors.push("Two scenes share an id."); ids.add(s.id);
    if (s.shots.length > MAX_SHOTS_PER_SCENE) errors.push(`Scene "${s.title}" has too many shots.`);
    for (const x of s.shots) {
      if (!x || typeof x.id !== "string" || typeof x.title !== "string" || typeof x.framing !== "string" || typeof x.movement !== "string" || typeof x.notes !== "string") { errors.push("A shot is malformed."); continue; }
      if (!Number.isFinite(x.duration) || x.duration < 0.5 || x.duration > MAX_SHOT_SECONDS) errors.push(`Shot "${x.title}" has an invalid planned length.`);
      if (ids.has(x.id)) errors.push("Two shots share an id."); ids.add(x.id);
      if (x.clipId !== undefined) { if (typeof x.clipId !== "string") errors.push("A shot link is malformed."); else if (linkedClips.has(x.clipId)) errors.push("A clip is linked to two shots."); else linkedClips.add(x.clipId); }
    }
  }
  return errors;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** Adds the scenes and shots from a saved Director desk production after the ones already in the plan.
 *  The input comes from storage, so nothing about it is trusted: malformed scenes and shots are skipped,
 *  text is cut to length, planned lengths are kept in range, and every scene and shot gets a new id. */
export function importProduction(doc: TimelineDoc, production: unknown): TimelineDoc {
  if (!isObj(production) || !Array.isArray(production.scenes)) throw new TimelineError("That is not a Director plan.");
  const scenes: FilmScene[] = [];
  for (const raw of production.scenes) {
    if (!isObj(raw)) continue;
    const shots: FilmShot[] = [];
    for (const r of Array.isArray(raw.shots) ? raw.shots : []) {
      if (!isObj(r)) continue;
      const d = typeof r.duration === "number" && Number.isFinite(r.duration) ? r.duration : 4;
      shots.push({ id: newId("shot"), title: clean(r.title, TEXT_MAX) || `Shot ${shots.length + 1}`, framing: clean(r.framing, 40) || "Medium", movement: clean(r.movement, 40) || "Static", duration: round3(Math.min(MAX_SHOT_SECONDS, Math.max(0.5, d))), notes: clean(r.notes, NOTES_MAX) });
    }
    if (shots.length > MAX_SHOTS_PER_SCENE) throw new TimelineError(`A scene in the Director plan has ${shots.length} shots; a scene here can have up to ${MAX_SHOTS_PER_SCENE}.`);
    scenes.push({ id: newId("scene"), title: clean(raw.title, TEXT_MAX) || `Scene ${plan(doc).scenes.length + scenes.length + 1}`, location: clean(raw.location, TEXT_MAX) || "Unspecified location", timeOfDay: clean(raw.timeOfDay, 40) || "Day", description: clean(raw.description, NOTES_MAX), shots });
  }
  if (scenes.length === 0) throw new TimelineError("The Director plan has no scenes to import.");
  const room = MAX_SCENES - plan(doc).scenes.length;
  if (scenes.length > room) throw new TimelineError(`The Director plan has ${scenes.length} scenes; this film has room for ${room} more.`);
  return withPlan(doc, [...plan(doc).scenes, ...scenes]);
}
