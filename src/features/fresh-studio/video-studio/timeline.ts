/**
 * Fresh Studio multitrack timeline (spec §6.5, §6.6).
 * Pure, immutable operations on a plain-JSON document so it can be autosaved, versioned,
 * undone, and tested in Node. Times are seconds, rounded to milliseconds to avoid float drift.
 */

export const TRACK_KINDS = ["video", "overlay", "image", "title", "caption", "voiceover", "music", "sfx", "animation", "adjustment"] as const;
export type TrackKind = (typeof TRACK_KINDS)[number];
/** Track kinds the Phase 2 editor and renderer can actually handle. The rest are listed in the spec but not built. */
export const SUPPORTED_TRACK_KINDS: readonly TrackKind[] = ["video", "music"];

export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;
export const MIN_CLIP_SECONDS = 0.1;
export const MAX_CLIPS = 200;
export const MAX_TRACKS = 12;

export type TimelineAsset = {
  id: string;
  name: string;
  kind: "video" | "audio" | "image";
  /** Seconds. Images have no intrinsic duration. */
  duration: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
};

export type TimelineTrack = { id: string; kind: TrackKind; name: string; muted: boolean; locked: boolean };

export type TimelineClip = {
  id: string;
  trackId: string;
  assetId: string;
  /** Position on the timeline, seconds. */
  start: number;
  /** Range of the source used, seconds. */
  sourceIn: number;
  sourceOut: number;
  speed: number;
};

export type TimelineDoc = {
  version: 1;
  fps: number;
  assets: TimelineAsset[];
  tracks: TimelineTrack[];
  clips: TimelineClip[];
};

export class TimelineError extends Error {
  constructor(message: string) { super(message); this.name = "TimelineError"; }
}

export const round3 = (n: number) => Math.round(n * 1000) / 1000;
export const clipDuration = (c: TimelineClip) => round3((c.sourceOut - c.sourceIn) / c.speed);
export const clipEnd = (c: TimelineClip) => round3(c.start + clipDuration(c));

export function createTimeline(fps = 30): TimelineDoc {
  return {
    version: 1,
    fps,
    assets: [],
    tracks: [
      { id: "v1", kind: "video", name: "Video 1", muted: false, locked: false },
      { id: "m1", kind: "music", name: "Music 1", muted: false, locked: false },
    ],
    clips: [],
  };
}

export const trackClips = (doc: TimelineDoc, trackId: string) =>
  doc.clips.filter((c) => c.trackId === trackId).sort((a, b) => a.start - b.start);

export const timelineDuration = (doc: TimelineDoc) => doc.clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0);

function find(doc: TimelineDoc, clipId: string): TimelineClip {
  const clip = doc.clips.find((c) => c.id === clipId);
  if (!clip) throw new TimelineError("That clip no longer exists.");
  return clip;
}
function track(doc: TimelineDoc, trackId: string): TimelineTrack {
  const t = doc.tracks.find((x) => x.id === trackId);
  if (!t) throw new TimelineError("That track does not exist.");
  return t;
}
function unlocked(doc: TimelineDoc, trackId: string): TimelineTrack {
  const t = track(doc, trackId);
  if (t.locked) throw new TimelineError(`${t.name} is locked.`);
  return t;
}
const replace = (doc: TimelineDoc, clip: TimelineClip): TimelineDoc => ({ ...doc, clips: doc.clips.map((c) => (c.id === clip.id ? clip : c)) });

function overlaps(doc: TimelineDoc, candidate: TimelineClip, ignoreId?: string): boolean {
  const s = candidate.start;
  const e = clipEnd(candidate);
  return doc.clips.some((c) => c.trackId === candidate.trackId && c.id !== ignoreId && c.start < e - 1e-6 && clipEnd(c) > s + 1e-6);
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  const rand = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? `${Date.now().toString(36)}${counter}`;
  return `${prefix}-${rand}`;
}

export function addAsset(doc: TimelineDoc, asset: TimelineAsset): TimelineDoc {
  if (doc.assets.some((a) => a.id === asset.id)) return doc;
  return { ...doc, assets: [...doc.assets, asset] };
}

/** Appends a full-length clip of an asset to the end of a track (or at `start`). */
export function addClip(doc: TimelineDoc, input: { trackId: string; assetId: string; start?: number; id?: string }): TimelineDoc {
  const t = unlocked(doc, input.trackId);
  const asset = doc.assets.find((a) => a.id === input.assetId);
  if (!asset) throw new TimelineError("Import the media before adding it to the timeline.");
  if (doc.clips.length >= MAX_CLIPS) throw new TimelineError(`A timeline can have at most ${MAX_CLIPS} clips.`);
  const allowed = asset.kind === "audio" ? t.kind === "music" : t.kind === "video";
  if (!allowed) throw new TimelineError(asset.kind === "audio" ? "Audio belongs on a music track." : "Video and images belong on a video track.");
  if (asset.duration === null) throw new TimelineError("Still images are not supported on the timeline yet.");
  const end = trackClips(doc, t.id).reduce((m, c) => Math.max(m, clipEnd(c)), 0);
  const clip: TimelineClip = {
    id: input.id ?? newId("clip"), trackId: t.id, assetId: asset.id,
    start: round3(Math.max(0, input.start ?? end)), sourceIn: 0, sourceOut: round3(asset.duration), speed: 1,
  };
  if (overlaps(doc, clip)) throw new TimelineError("There is already a clip there.");
  return { ...doc, clips: [...doc.clips, clip] };
}

/** Splits the clip at a timeline time strictly inside it. */
export function splitClip(doc: TimelineDoc, clipId: string, at: number, rightId?: string): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  const t = round3(at);
  if (t <= clip.start + MIN_CLIP_SECONDS || t >= clipEnd(clip) - MIN_CLIP_SECONDS) throw new TimelineError("Move the playhead inside the clip to split it.");
  const sourceAt = round3(clip.sourceIn + (t - clip.start) * clip.speed);
  const left: TimelineClip = { ...clip, sourceOut: sourceAt };
  const right: TimelineClip = { ...clip, id: rightId ?? newId("clip"), start: t, sourceIn: sourceAt };
  if (doc.clips.length >= MAX_CLIPS) throw new TimelineError(`A timeline can have at most ${MAX_CLIPS} clips.`);
  return { ...doc, clips: [...doc.clips.filter((c) => c.id !== clip.id), left, right] };
}

/** Moves the clip's left edge to a new timeline time (shortens or, within the source, lengthens it). */
export function trimClipStart(doc: TimelineDoc, clipId: string, newStart: number): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  const end = clipEnd(clip);
  const s = round3(Math.max(0, newStart));
  if (s > end - MIN_CLIP_SECONDS) throw new TimelineError("A clip must stay at least 0.1 seconds long.");
  const sourceIn = round3(clip.sourceIn + (s - clip.start) * clip.speed);
  if (sourceIn < 0) throw new TimelineError("There is no more source media before this point.");
  const next = { ...clip, start: s, sourceIn };
  if (overlaps(doc, next, clip.id)) throw new TimelineError("That would overlap the previous clip.");
  return replace(doc, next);
}

/** Moves the clip's right edge to a new timeline time. */
export function trimClipEnd(doc: TimelineDoc, clipId: string, newEnd: number): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  const e = round3(newEnd);
  if (e < clip.start + MIN_CLIP_SECONDS) throw new TimelineError("A clip must stay at least 0.1 seconds long.");
  const sourceOut = round3(clip.sourceIn + (e - clip.start) * clip.speed);
  const asset = doc.assets.find((a) => a.id === clip.assetId);
  if (asset?.duration != null && sourceOut > asset.duration + 1e-6) throw new TimelineError("There is no more source media after this point.");
  const next = { ...clip, sourceOut };
  if (overlaps(doc, next, clip.id)) throw new TimelineError("That would overlap the next clip.");
  return replace(doc, next);
}

export function moveClip(doc: TimelineDoc, clipId: string, newStart: number, trackId?: string): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  const target = unlocked(doc, trackId ?? clip.trackId);
  const asset = doc.assets.find((a) => a.id === clip.assetId);
  if (asset && (asset.kind === "audio" ? target.kind !== "music" : target.kind !== "video")) throw new TimelineError("That track cannot hold this kind of media.");
  const next = { ...clip, trackId: target.id, start: round3(Math.max(0, newStart)) };
  if (overlaps(doc, next, clip.id)) throw new TimelineError("There is already a clip there.");
  return replace(doc, next);
}

/** Deletes a clip. With ripple, later clips on the same track close the gap. */
export function deleteClip(doc: TimelineDoc, clipId: string, ripple = false): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  const gap = clipDuration(clip);
  const clips = doc.clips
    .filter((c) => c.id !== clip.id)
    .map((c) => (ripple && c.trackId === clip.trackId && c.start >= clip.start ? { ...c, start: round3(c.start - gap) } : c));
  return { ...doc, clips };
}

/** Places a copy directly after the original, pushing later clips on that track right. */
export function duplicateClip(doc: TimelineDoc, clipId: string, copyId?: string): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  if (doc.clips.length >= MAX_CLIPS) throw new TimelineError(`A timeline can have at most ${MAX_CLIPS} clips.`);
  const d = clipDuration(clip);
  const copy: TimelineClip = { ...clip, id: copyId ?? newId("clip"), start: clipEnd(clip) };
  const clips = doc.clips.map((c) => (c.trackId === clip.trackId && c.start >= copy.start - 1e-6 ? { ...c, start: round3(c.start + d) } : c));
  return { ...doc, clips: [...clips, copy] };
}

/** Changes speed (0.25x–4x). Later clips on the track shift so nothing overlaps. */
export function setClipSpeed(doc: TimelineDoc, clipId: string, speed: number): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  if (!Number.isFinite(speed) || speed < MIN_SPEED || speed > MAX_SPEED) throw new TimelineError(`Speed must be between ${MIN_SPEED}× and ${MAX_SPEED}×.`);
  const before = clipDuration(clip);
  const next = { ...clip, speed: round3(speed) };
  const delta = round3(clipDuration(next) - before);
  const clips = doc.clips.map((c) => {
    if (c.id === clip.id) return next;
    return c.trackId === clip.trackId && c.start >= clip.start + before - 1e-6 ? { ...c, start: round3(c.start + delta) } : c;
  });
  return { ...doc, clips };
}

/** Moves a clip to a new index in its track and re-packs the track without gaps. */
export function reorderClip(doc: TimelineDoc, clipId: string, toIndex: number): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  const ordered = trackClips(doc, clip.trackId);
  const from = ordered.findIndex((c) => c.id === clip.id);
  const to = Math.min(Math.max(0, Math.round(toIndex)), ordered.length - 1);
  const [moved] = ordered.splice(from, 1);
  ordered.splice(to, 0, moved);
  let cursor = ordered.length ? Math.min(...trackClips(doc, clip.trackId).map((c) => c.start)) : 0;
  const repacked = new Map<string, TimelineClip>();
  for (const c of ordered) { repacked.set(c.id, { ...c, start: round3(cursor) }); cursor += clipDuration(c); }
  return { ...doc, clips: doc.clips.map((c) => repacked.get(c.id) ?? c) };
}

export function setTrackFlags(doc: TimelineDoc, trackId: string, flags: Partial<Pick<TimelineTrack, "muted" | "locked">>): TimelineDoc {
  track(doc, trackId);
  return { ...doc, tracks: doc.tracks.map((t) => (t.id === trackId ? { ...t, ...flags } : t)) };
}

export function clipAt(doc: TimelineDoc, trackId: string, time: number): TimelineClip | null {
  return trackClips(doc, trackId).find((c) => time >= c.start - 1e-6 && time < clipEnd(c) - 1e-6) ?? null;
}

/** Full integrity check for a document loaded from storage or about to be rendered. */
export function validateTimeline(doc: unknown): string[] {
  const errors: string[] = [];
  if (typeof doc !== "object" || doc === null) return ["The timeline is missing."];
  const d = doc as TimelineDoc;
  if (d.version !== 1) errors.push("Unsupported timeline version.");
  if (!Number.isFinite(d.fps) || d.fps < 1 || d.fps > 120) errors.push("Frame rate is invalid.");
  if (!Array.isArray(d.assets) || !Array.isArray(d.tracks) || !Array.isArray(d.clips)) return [...errors, "The timeline is malformed."];
  if (d.tracks.length > MAX_TRACKS) errors.push("Too many tracks.");
  if (d.clips.length > MAX_CLIPS) errors.push("Too many clips.");
  const assets = new Map(d.assets.map((a) => [a.id, a]));
  const tracks = new Map(d.tracks.map((t) => [t.id, t]));
  for (const c of d.clips) {
    const a = assets.get(c.assetId);
    if (!a) { errors.push(`Clip ${c.id} uses missing media.`); continue; }
    if (!tracks.has(c.trackId)) errors.push(`Clip ${c.id} is on a missing track.`);
    if (![c.start, c.sourceIn, c.sourceOut, c.speed].every(Number.isFinite)) { errors.push(`Clip ${c.id} has invalid numbers.`); continue; }
    if (c.start < 0 || c.sourceIn < 0 || c.sourceOut - c.sourceIn < MIN_CLIP_SECONDS - 1e-6) errors.push(`Clip ${c.id} has an invalid range.`);
    if (c.speed < MIN_SPEED || c.speed > MAX_SPEED) errors.push(`Clip ${c.id} has an unsupported speed.`);
    if (a.duration !== null && c.sourceOut > a.duration + 1e-3) errors.push(`Clip ${c.id} extends past its media.`);
  }
  for (const t of d.tracks) {
    const list = trackClips(d, t.id);
    for (let i = 1; i < list.length; i += 1) if (list[i].start < clipEnd(list[i - 1]) - 1e-3) errors.push(`Clips overlap on ${t.name}.`);
  }
  return errors;
}

/** Undo/redo history of whole documents (cheap: documents are small and operations are immutable). */
export type History = { past: TimelineDoc[]; present: TimelineDoc; future: TimelineDoc[] };
export const HISTORY_LIMIT = 100;
export const createHistory = (present: TimelineDoc): History => ({ past: [], present, future: [] });
export function commit(h: History, next: TimelineDoc): History {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}
export const canUndo = (h: History) => h.past.length > 0;
export const canRedo = (h: History) => h.future.length > 0;
export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}
export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
