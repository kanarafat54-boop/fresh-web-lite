import type { FilmPlan } from "./film.ts";
import { validateFilm } from "./film.ts";

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

/** Colour adjustments. Neutral is brightness 0, contrast 1, saturation 1. Rendered with ffmpeg `eq`; the editor preview approximates it. */
export type ClipLook = { brightness: number; contrast: number; saturation: number };
export const NEUTRAL_LOOK: ClipLook = { brightness: 0, contrast: 1, saturation: 1 };
export const LOOK_PRESETS: ReadonlyArray<{ id: string; name: string; look: ClipLook }> = [
  { id: "none", name: "Original", look: NEUTRAL_LOOK },
  { id: "mono", name: "Mono", look: { brightness: 0, contrast: 1.1, saturation: 0 } },
  { id: "vivid", name: "Vivid", look: { brightness: 0, contrast: 1.1, saturation: 1.6 } },
  { id: "punchy", name: "Punchy", look: { brightness: -0.02, contrast: 1.3, saturation: 1.2 } },
  { id: "faded", name: "Faded", look: { brightness: 0.06, contrast: 0.85, saturation: 0.7 } },
  { id: "moody", name: "Moody", look: { brightness: -0.12, contrast: 1.2, saturation: 0.85 } },
];
export const MAX_VOLUME = 2;
export type ClipFit = "fit" | "fill";

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
  /** Audio gain, 0–2 (1 = unchanged). Optional so older saved timelines stay valid. */
  volume?: number;
  /** Fade from/to black (video) and silence (audio), seconds. */
  fadeIn?: number;
  fadeOut?: number;
  look?: ClipLook;
  /** "fit" letterboxes; "fill" crops to cover the frame. */
  fit?: ClipFit;
  /** How this clip is revealed after the clip before it (which must end exactly where this one starts). */
  transitionIn?: ClipTransition;
  /** Animated zoom and position from the first frame of the clip to the last. */
  motion?: ClipMotion;
  /** Where a clip on an upper video track sits over the picture below (picture-in-picture). Ignored on the base track. */
  layer?: ClipLayer;
};

/** Centre (as a fraction of the frame), width (fraction of the frame; the window has the frame's shape) and opacity. */
export type ClipLayer = { x: number; y: number; width: number; opacity: number };
export const DEFAULT_LAYER: ClipLayer = { x: 0.75, y: 0.25, width: 0.4, opacity: 1 };
export const MIN_LAYER_WIDTH = 0.1;
export const MAX_VIDEO_TRACKS = 2;


/** Start and end keyframes for the picture. Zoom 1 = whole frame; position −1…1 pans across the extra area a zoom reveals. */
export type MotionKey = { /** Progress through the clip, strictly between 0 and 1. */ at: number; zoom: number; x: number; y: number };
export type ClipMotion = { fromZoom: number; toZoom: number; fromX: number; toX: number; fromY: number; toY: number; /** Extra keyframes between the start and the end. Optional so older projects stay valid. */ mid?: MotionKey[] };
export const MAX_MID_KEYS = 4;
export const MIN_KEY_GAP = 0.02;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const MOTION_PRESETS: ReadonlyArray<{ id: string; name: string; motion: ClipMotion | null }> = [
  { id: "none", name: "None", motion: null },
  { id: "zoom-in", name: "Zoom in", motion: { fromZoom: 1, toZoom: 1.3, fromX: 0, toX: 0, fromY: 0, toY: 0 } },
  { id: "zoom-out", name: "Zoom out", motion: { fromZoom: 1.3, toZoom: 1, fromX: 0, toX: 0, fromY: 0, toY: 0 } },
  { id: "pan-left", name: "Pan left", motion: { fromZoom: 1.25, toZoom: 1.25, fromX: 1, toX: -1, fromY: 0, toY: 0 } },
  { id: "pan-right", name: "Pan right", motion: { fromZoom: 1.25, toZoom: 1.25, fromX: -1, toX: 1, fromY: 0, toY: 0 } },
  { id: "drift-up", name: "Rise", motion: { fromZoom: 1.2, toZoom: 1.2, fromX: 0, toX: 0, fromY: 1, toY: -1 } },
];

export const TRANSITION_TYPES = [
  { id: "dissolve", label: "Dissolve", hint: "Cross-fades over the last frame of the previous clip" },
  { id: "dip", label: "Dip to black", hint: "Fades out, then fades in" },
  { id: "wipe", label: "Wipe", hint: "A hard edge sweeps across" },
  { id: "slide", label: "Slide", hint: "The new clip pushes in from the right" },
] as const;
export type TransitionType = (typeof TRANSITION_TYPES)[number]["id"];
export type ClipTransition = { type: TransitionType; duration: number };
export const MIN_TRANSITION_SECONDS = 0.2;
export const MAX_TRANSITION_SECONDS = 2;
const ADJACENT = 1e-3;

/** How burned-in captions look. "classic" is the original look. */
export const CAPTION_STYLES = [
  { id: "classic", name: "Classic", hint: "White with an outline" },
  { id: "bold", name: "Bold", hint: "Large yellow" },
  { id: "box", name: "Box", hint: "White on a dark box" },
  { id: "minimal", name: "Minimal", hint: "Small and quiet" },
  { id: "top", name: "Headline", hint: "Large, at the top" },
] as const;
export type CaptionStyleId = (typeof CAPTION_STYLES)[number]["id"];
export const isCaptionStyle = (v: unknown): v is CaptionStyleId => CAPTION_STYLES.some((s) => s.id === v);

export const MAX_TEXTS = 50;
export const MAX_TEXT_CHARS = 200;
export const MIN_TEXT_SECONDS = 0.2;
export type TextLayer = {
  id: string;
  text: string;
  start: number;
  duration: number;
  /** Centre of the text as a fraction of the frame (0–1). */
  x: number;
  y: number;
  /** Font height as a fraction of frame height. */
  size: number;
  /** #rrggbb */
  color: string;
  bold: boolean;
  /** Semi-transparent box behind the text for legibility. */
  box: boolean;
};

export const MAX_OVERLAYS = 30;
export const MIN_OVERLAY_SECONDS = 0.2;
/** An image (from the project's imported pictures) or a plain rectangle drawn over the video. */
export type OverlayLayer = {
  id: string;
  kind: "image" | "rect";
  /** Imported picture; only for kind "image". */
  assetId?: string;
  start: number;
  duration: number;
  /** Centre of the layer as a fraction of the frame (0–1). */
  x: number;
  y: number;
  /** Width as a fraction of frame width. An image keeps its own proportions; a rectangle also has `height`. */
  width: number;
  height: number;
  opacity: number;
  /** Clockwise turn in degrees, −180…180. Optional so older saved timelines stay valid. */
  rotation?: number;
  /** #rrggbb, rectangles only. */
  color: string;
};
export const MAX_ROTATION = 180;

export type TimelineDoc = {
  version: 1;
  fps: number;
  assets: TimelineAsset[];
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  /** Title and text layers. Optional so older saved timelines stay valid. */
  texts?: TextLayer[];
  /** Look of burned-in captions; absent means classic. */
  captionStyle?: CaptionStyleId;
  /** Pictures and shapes shown on top of the video. */
  overlays?: OverlayLayer[];
  /** Output aspect ratio the preview and export use, e.g. "16:9". */
  aspect?: string;
  /** Scenes and shots for a multi-scene film (see film.ts). Optional so older saved timelines stay valid. */
  film?: FilmPlan;
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

/** The first video track is the base picture; later video tracks are drawn on top of it. */
export const baseVideoTrack = (doc: TimelineDoc) => doc.tracks.find((t) => t.kind === "video") ?? null;
export const layerVideoTracks = (doc: TimelineDoc) => doc.tracks.filter((t) => t.kind === "video").slice(1);
export const isLayerTrack = (doc: TimelineDoc, trackId: string) => layerVideoTracks(doc).some((t) => t.id === trackId);

/** Adds the second video track (for picture-in-picture). Does nothing if it already exists. */
export function addVideoLayer(doc: TimelineDoc): TimelineDoc {
  if (doc.tracks.filter((t) => t.kind === "video").length >= MAX_VIDEO_TRACKS) return doc;
  const ids = new Set(doc.tracks.map((t) => t.id));
  const id = ["v2", "v3", "v4"].find((x) => !ids.has(x)) ?? newId("v");
  const lastVideo = doc.tracks.map((t, i) => (t.kind === "video" ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
  const tracks = [...doc.tracks.slice(0, lastVideo + 1), { id, kind: "video" as const, name: "Video 2", muted: false, locked: false }, ...doc.tracks.slice(lastVideo + 1)];
  return { ...doc, tracks };
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
/** Shrinks fades so they never exceed the clip, e.g. after a trim or a speed change. */
export function withFittedFades(clip: TimelineClip): TimelineClip {
  const d = clipDuration(clip);
  const a = clip.fadeIn ?? 0, b = clip.fadeOut ?? 0;
  if (a + b <= d + 1e-6) return clip;
  const k = d / (a + b);
  return { ...clip, fadeIn: round3(a * k), fadeOut: round3(b * k) };
}
const replace = (doc: TimelineDoc, clip: TimelineClip): TimelineDoc => ({ ...doc, clips: doc.clips.map((c) => (c.id === clip.id ? withFittedFades(clip) : c)) });

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
  if (isLayerTrack(doc, t.id)) clip.layer = { ...DEFAULT_LAYER };
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
  const p = (t - clip.start) / clipDuration(clip);
  const m = clip.motion;
  const leftMotion = m ? { motion: sliceMotion(m, 0, p) } : {};
  const rightMotion = m ? { motion: sliceMotion(m, p, 1) } : {};
  const left: TimelineClip = withFittedFades({ ...clip, ...leftMotion, sourceOut: sourceAt, ...(clip.fadeOut ? { fadeOut: 0 } : {}) });
  const { transitionIn: _t, ...clipNoTransition } = clip; void _t;
  const right: TimelineClip = withFittedFades({ ...clipNoTransition, ...rightMotion, id: rightId ?? newId("clip"), start: t, sourceIn: sourceAt, ...(clip.fadeIn ? { fadeIn: 0 } : {}) });
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
  const next: TimelineClip = { ...clip, trackId: target.id, start: round3(Math.max(0, newStart)) };
  if (asset?.kind !== "audio") {
    // A clip moved up gets a picture-in-picture window; moved down to the base it fills the frame again.
    if (isLayerTrack(doc, target.id)) next.layer = clip.layer ?? { ...DEFAULT_LAYER };
    else delete next.layer;
  }
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
  const { transitionIn: _t, ...base } = clip; void _t;
  const copy: TimelineClip = { ...base, id: copyId ?? newId("clip"), start: clipEnd(clip) };
  const clips = doc.clips.map((c) => (c.trackId === clip.trackId && c.start >= copy.start - 1e-6 ? { ...c, start: round3(c.start + d) } : c));
  return { ...doc, clips: [...clips, copy] };
}

/** Changes speed (0.25x–4x). Later clips on the track shift so nothing overlaps. */
export function setClipSpeed(doc: TimelineDoc, clipId: string, speed: number): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  if (!Number.isFinite(speed) || speed < MIN_SPEED || speed > MAX_SPEED) throw new TimelineError(`Speed must be between ${MIN_SPEED}× and ${MAX_SPEED}×.`);
  const before = clipDuration(clip);
  const next = withFittedFades({ ...clip, speed: round3(speed) });
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



/** Volume (0–2) and fades for one clip. Omitted fields stay unchanged. */
export function setClipAudio(doc: TimelineDoc, clipId: string, patch: { volume?: number; fadeIn?: number; fadeOut?: number }): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  const next: TimelineClip = { ...clip };
  if (patch.volume !== undefined) {
    if (!Number.isFinite(patch.volume) || patch.volume < 0 || patch.volume > MAX_VOLUME) throw new TimelineError(`Volume must be between 0 and ${MAX_VOLUME * 100}%.`);
    next.volume = round3(patch.volume);
  }
  const d = clipDuration(clip);
  for (const key of ["fadeIn", "fadeOut"] as const) {
    const v = patch[key];
    if (v === undefined) continue;
    if (!Number.isFinite(v) || v < 0) throw new TimelineError("A fade cannot be negative.");
    next[key] = round3(Math.min(v, d));
  }
  const other = patch.fadeIn !== undefined && patch.fadeOut === undefined ? "fadeOut" : patch.fadeOut !== undefined && patch.fadeIn === undefined ? "fadeIn" : null;
  const changed = patch.fadeIn !== undefined && patch.fadeOut === undefined ? "fadeIn" : "fadeOut";
  // When one fade grows into the other, shorten the one that was not just edited.
  if (other && (next.fadeIn ?? 0) + (next.fadeOut ?? 0) > d) next[other] = round3(Math.max(0, d - (next[changed] ?? 0)));
  return replace(doc, next);
}

/** Sets colour adjustments, or clears them with null. */
export function setClipLook(doc: TimelineDoc, clipId: string, look: ClipLook | null): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  if (look === null) { const { look: _drop, ...rest } = clip; return replace(doc, rest); }
  const ok = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi;
  if (!ok(look.brightness, -1, 1) || !ok(look.contrast, 0, 2) || !ok(look.saturation, 0, 3)) throw new TimelineError("That colour setting is out of range.");
  return replace(doc, { ...clip, look: { brightness: round3(look.brightness), contrast: round3(look.contrast), saturation: round3(look.saturation) } });
}

/** The clip that ends exactly where `clip` starts on the same track, if any. */
export function previousAdjacent(doc: TimelineDoc, clip: TimelineClip): TimelineClip | null {
  const prev = trackClips(doc, clip.trackId).filter((c) => c.id !== clip.id && c.start < clip.start).pop();
  return prev && Math.abs(clipEnd(prev) - clip.start) <= ADJACENT ? prev : null;
}
/** Longest transition this clip can take (null when it has no neighbour before it). */
export function maxTransition(doc: TimelineDoc, clip: TimelineClip): number | null {
  if (isLayerTrack(doc, clip.trackId)) return null; // transitions are for the base picture only
  const prev = previousAdjacent(doc, clip);
  if (!prev) return null;
  return round3(Math.min(MAX_TRANSITION_SECONDS, clipDuration(clip) / 2, clipDuration(prev) * 2));
}
function transitionProblem(doc: TimelineDoc, clip: TimelineClip): string | null {
  const t = clip.transitionIn;
  if (!t) return null;
  if (!TRANSITION_TYPES.some((x) => x.id === t.type)) return "unknown transition";
  if (!Number.isFinite(t.duration) || t.duration < MIN_TRANSITION_SECONDS - 1e-6) return "transition is too short";
  const max = maxTransition(doc, clip);
  if (max === null) return "transition needs a clip right before it";
  if (t.duration > max + 1e-6) return "transition is longer than the clips allow";
  return null;
}
/** Adds, changes or (with null) removes the transition into a clip. */
export function setTransition(doc: TimelineDoc, clipId: string, transition: ClipTransition | null): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  if (transition === null) {
    if (!clip.transitionIn) return doc;
    const { transitionIn: _drop, ...rest } = clip; void _drop;
    return { ...doc, clips: doc.clips.map((c) => (c.id === clip.id ? rest : c)) };
  }
  const max = maxTransition(doc, clip);
  if (max === null) throw new TimelineError("Place this clip directly after another clip to add a transition.");
  if (max < MIN_TRANSITION_SECONDS) throw new TimelineError("These clips are too short for a transition.");
  if (!TRANSITION_TYPES.some((x) => x.id === transition.type)) throw new TimelineError("Unknown transition.");
  const duration = round3(Math.min(Math.max(transition.duration, MIN_TRANSITION_SECONDS), max));
  return { ...doc, clips: doc.clips.map((c) => (c.id === clip.id ? { ...c, transitionIn: { type: transition.type, duration } } : c)) };
}
/** Drops or shortens transitions whose neighbours moved or shrank, so edits never leave a broken one behind. */
export function normalizeTransitions(doc: TimelineDoc): TimelineDoc {
  if (!doc.clips.some((c) => c.transitionIn)) return doc;
  let changed = false;
  const clips = doc.clips.map((c) => {
    if (!c.transitionIn) return c;
    const max = maxTransition(doc, c);
    if (max === null || max < MIN_TRANSITION_SECONDS) { changed = true; const { transitionIn: _d, ...rest } = c; void _d; return rest; }
    if (c.transitionIn.duration > max + 1e-6) { changed = true; return { ...c, transitionIn: { ...c.transitionIn, duration: max } }; }
    return c;
  });
  return changed ? { ...doc, clips } : doc;
}
/**
 * Fade lengths a clip really has. A transition adds half its length as a fade on each side of the cut for sound
 * (all types), and for the picture only for "dip to black"; the other types blend pictures instead.
 */
export function effectiveFades(doc: TimelineDoc, clip: TimelineClip, medium: "audio" | "video"): { fadeIn: number; fadeOut: number } {
  const counts = (t: ClipTransition) => medium === "audio" || t.type === "dip";
  let fadeIn = clip.fadeIn ?? 0, fadeOut = clip.fadeOut ?? 0;
  const own = clip.transitionIn;
  if (own && counts(own)) fadeIn = Math.max(fadeIn, own.duration / 2);
  const next = nextAdjacent(doc, clip);
  if (next?.transitionIn && counts(next.transitionIn)) fadeOut = Math.max(fadeOut, next.transitionIn.duration / 2);
  return { fadeIn: round3(fadeIn), fadeOut: round3(fadeOut) };
}
/** The clip that starts exactly where `clip` ends on the same track, if any. */
export function nextAdjacent(doc: TimelineDoc, clip: TimelineClip): TimelineClip | null {
  return trackClips(doc, clip.trackId).find((c) => c.id !== clip.id && c.start >= clip.start && Math.abs(clipEnd(clip) - c.start) <= ADJACENT) ?? null;
}

const within = (n: unknown, lo: number, hi: number) => typeof n === "number" && Number.isFinite(n) && n >= lo - 1e-9 && n <= hi + 1e-9;
export function motionProblem(m: ClipMotion): string | null {
  if (!m || typeof m !== "object") return "Motion settings are missing.";
  if (!within(m.fromZoom, MIN_ZOOM, MAX_ZOOM) || !within(m.toZoom, MIN_ZOOM, MAX_ZOOM)) return `Zoom must be between ${MIN_ZOOM}× and ${MAX_ZOOM}×.`;
  if (![m.fromX, m.toX, m.fromY, m.toY].every((v) => within(v, -1, 1))) return "Position must stay inside the frame (−100% to 100%).";
  if (m.mid !== undefined) {
    if (!Array.isArray(m.mid) || m.mid.length > MAX_MID_KEYS) return `A clip can have at most ${MAX_MID_KEYS} extra keyframes.`;
    let last = 0;
    for (const k of m.mid) {
      if (!k || typeof k !== "object" || typeof k.at !== "number" || !Number.isFinite(k.at)) return "A keyframe has invalid settings.";
      if (!within(k.zoom, MIN_ZOOM, MAX_ZOOM)) return `Zoom must be between ${MIN_ZOOM}× and ${MAX_ZOOM}×.`;
      if (!within(k.x, -1, 1) || !within(k.y, -1, 1)) return "Position must stay inside the frame (−100% to 100%).";
      if (k.at < last + MIN_KEY_GAP - 1e-9 || k.at > 1 - MIN_KEY_GAP + 1e-9) return "Keyframes must be in order and not on top of each other or the clip's ends.";
      last = k.at;
    }
  }
  return null;
}
type MotionPoint = { at: number; zoom: number; x: number; y: number };
/** Every keyframe in order, start and end included. */
export const motionPoints = (m: ClipMotion): MotionPoint[] => [{ at: 0, zoom: m.fromZoom, x: m.fromX, y: m.fromY }, ...(m.mid ?? []), { at: 1, zoom: m.toZoom, x: m.toX, y: m.toY }];
function motionFromPoints(pts: MotionPoint[]): ClipMotion {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  const first = pts[0], last = pts[pts.length - 1], mid = pts.slice(1, -1).map((k) => ({ at: r(k.at), zoom: r(k.zoom), x: r(k.x), y: r(k.y) }));
  return { fromZoom: r(first.zoom), fromX: r(first.x), fromY: r(first.y), toZoom: r(last.zoom), toX: r(last.x), toY: r(last.y), ...(mid.length ? { mid } : {}) };
}
/** The part of a motion between progress a and b (0–1), stretched to fill a whole clip. Used when a clip is split. */
export function sliceMotion(m: ClipMotion, a: number, b: number): ClipMotion {
  const at = (p: number) => ({ at: p, ...motionAt(m, p) });
  const inside = motionPoints(m).filter((k) => k.at > a + MIN_KEY_GAP / 2 && k.at < b - MIN_KEY_GAP / 2).map((k) => ({ ...k, at: (k.at - a) / (b - a) }));
  const s = at(a), e = at(b);
  return motionFromPoints([{ ...s, at: 0 }, ...inside, { ...e, at: 1 }]);
}
/** Sets (or with null removes) the start→end motion of a clip. */
export function setClipMotion(doc: TimelineDoc, clipId: string, motion: ClipMotion | null): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  if (motion === null) {
    if (!clip.motion) return doc;
    const { motion: _m, ...rest } = clip; void _m;
    return { ...doc, clips: doc.clips.map((c) => (c.id === clip.id ? rest : c)) };
  }
  const why = motionProblem(motion);
  if (why) throw new TimelineError(why);
  return { ...doc, clips: doc.clips.map((c) => (c.id === clip.id ? { ...c, motion: motionFromPoints(motionPoints(motion)) } : c)) };
}
/** Zoom and position at progress p (0–1) through the clip. */
export function motionAt(m: ClipMotion | undefined, p: number): { zoom: number; x: number; y: number } {
  if (!m) return { zoom: 1, x: 0, y: 0 };
  const k = Math.min(1, Math.max(0, p));
  const pts = motionPoints(m);
  let i = 0;
  while (i < pts.length - 2 && k > pts[i + 1].at) i += 1;
  const a = pts[i], b = pts[i + 1], f = b.at === a.at ? 0 : (k - a.at) / (b.at - a.at);
  const mix = (u: number, v: number) => u + (v - u) * f;
  return { zoom: mix(a.zoom, b.zoom), x: mix(a.x, b.x), y: mix(a.y, b.y) };
}

export function layerProblem(l: ClipLayer): string | null {
  if (!l || typeof l !== "object" || ![l.x, l.y, l.width, l.opacity].every((n) => typeof n === "number" && Number.isFinite(n))) return "Layer settings are invalid.";
  if (l.x < 0 || l.x > 1 || l.y < 0 || l.y > 1) return "The layer must stay inside the frame.";
  if (l.width < MIN_LAYER_WIDTH - 1e-9 || l.width > 1) return "Layer size is out of range.";
  if (l.opacity < 0.05 || l.opacity > 1) return "Layer opacity must be between 5% and 100%.";
  return null;
}
/** Changes where a clip on an upper video track sits. */
export function setClipLayer(doc: TimelineDoc, clipId: string, patch: Partial<ClipLayer>): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  if (!isLayerTrack(doc, clip.trackId)) throw new TimelineError("Only clips on the upper video track can be placed over the picture.");
  const next = { ...DEFAULT_LAYER, ...clip.layer, ...patch };
  const r = (n: number) => Math.round(n * 1000) / 1000;
  const layer = { x: r(next.x), y: r(next.y), width: r(next.width), opacity: r(next.opacity) };
  const why = layerProblem(layer);
  if (why) throw new TimelineError(why);
  return replace(doc, { ...clip, layer });
}

export function setClipFit(doc: TimelineDoc, clipId: string, fit: ClipFit): TimelineDoc {
  const clip = find(doc, clipId);
  unlocked(doc, clip.trackId);
  if (fit !== "fit" && fit !== "fill") throw new TimelineError("Unknown framing option.");
  return replace(doc, { ...clip, fit });
}

export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5", "21:9"] as const;
export function setAspect(doc: TimelineDoc, aspect: string): TimelineDoc {
  if (!(ASPECT_RATIOS as readonly string[]).includes(aspect)) throw new TimelineError("That aspect ratio is not available.");
  return doc.aspect === aspect ? doc : { ...doc, aspect };
}

// ---- text layers

const HEX = /^#[0-9a-fA-F]{6}$/;
export function validateTextLayer(t: TextLayer): string | null {
  if (typeof t.text !== "string" || t.text.trim().length === 0) return "Text cannot be empty.";
  if (t.text.length > MAX_TEXT_CHARS) return `Text can be at most ${MAX_TEXT_CHARS} characters.`;
  // eslint-disable-next-line no-control-regex -- control characters other than newline are never valid in a title
  if (/[\u0000-\u0009\u000b-\u001f\u007f]/.test(t.text)) return "Text contains characters that cannot be shown.";
  if (![t.start, t.duration, t.x, t.y, t.size].every(Number.isFinite)) return "Text has invalid numbers.";
  if (t.start < 0) return "Text cannot start before 0.";
  if (t.duration < MIN_TEXT_SECONDS - 1e-6) return `Text must last at least ${MIN_TEXT_SECONDS} seconds.`;
  if (t.x < 0 || t.x > 1 || t.y < 0 || t.y > 1) return "Text must stay inside the frame.";
  if (t.size < 0.02 || t.size > 0.3) return "Text size is out of range.";
  if (!HEX.test(t.color)) return "Text colour is invalid.";
  return null;
}
const findText = (doc: TimelineDoc, id: string) => {
  const t = doc.texts?.find((x) => x.id === id);
  if (!t) throw new TimelineError("That text no longer exists.");
  return t;
};

export function addText(doc: TimelineDoc, input: { text?: string; start: number; duration?: number; id?: string }): TimelineDoc {
  if ((doc.texts?.length ?? 0) >= MAX_TEXTS) throw new TimelineError(`A timeline can have at most ${MAX_TEXTS} text layers.`);
  const layer: TextLayer = { id: input.id ?? newId("text"), text: input.text ?? "Your text", start: round3(Math.max(0, input.start)), duration: round3(input.duration ?? 3), x: 0.5, y: 0.5, size: 0.08, color: "#ffffff", bold: true, box: false };
  const problem = validateTextLayer(layer);
  if (problem) throw new TimelineError(problem);
  return { ...doc, texts: [...(doc.texts ?? []), layer] };
}
export function updateText(doc: TimelineDoc, id: string, patch: Partial<Omit<TextLayer, "id">>): TimelineDoc {
  const next: TextLayer = { ...findText(doc, id), ...patch };
  next.start = round3(next.start); next.duration = round3(next.duration);
  const problem = validateTextLayer(next);
  if (problem) throw new TimelineError(problem);
  return { ...doc, texts: (doc.texts ?? []).map((t) => (t.id === id ? next : t)) };
}
export function deleteText(doc: TimelineDoc, id: string): TimelineDoc {
  findText(doc, id);
  return { ...doc, texts: (doc.texts ?? []).filter((t) => t.id !== id) };
}
/** Sets how burned-in captions look. "classic" clears the setting. */
export function setCaptionStyle(doc: TimelineDoc, style: CaptionStyleId): TimelineDoc {
  if (!isCaptionStyle(style)) throw new TimelineError("Unknown caption style.");
  if (style === "classic") { const { captionStyle: _drop, ...rest } = doc; return rest as TimelineDoc; }
  return doc.captionStyle === style ? doc : { ...doc, captionStyle: style };
}
export const textsAt = (doc: TimelineDoc, time: number) => (doc.texts ?? []).filter((t) => time >= t.start - 1e-6 && time < t.start + t.duration - 1e-6);

// ---- overlays (images and rectangles)

export function validateOverlay(o: OverlayLayer, doc?: TimelineDoc): string | null {
  if (!o || typeof o !== "object") return "Overlay is malformed.";
  if (o.kind !== "image" && o.kind !== "rect") return "Unknown overlay type.";
  if (![o.start, o.duration, o.x, o.y, o.width, o.height, o.opacity].every((n) => typeof n === "number" && Number.isFinite(n))) return "Overlay has invalid numbers.";
  if (o.start < 0) return "Overlay cannot start before 0.";
  if (o.duration < MIN_OVERLAY_SECONDS - 1e-6) return `Overlay must last at least ${MIN_OVERLAY_SECONDS} seconds.`;
  if (o.x < 0 || o.x > 1 || o.y < 0 || o.y > 1) return "Overlay must stay inside the frame.";
  if (o.width < 0.02 || o.width > 1 || o.height < 0.02 || o.height > 1) return "Overlay size is out of range.";
  if (o.opacity < 0.05 || o.opacity > 1) return "Overlay opacity must be between 5% and 100%.";
  if (o.rotation !== undefined && (typeof o.rotation !== "number" || !Number.isFinite(o.rotation) || Math.abs(o.rotation) > MAX_ROTATION)) return "Overlay rotation must be between −180° and 180°.";
  if (o.kind === "rect" && !HEX.test(o.color)) return "Overlay colour is invalid.";
  if (o.kind === "image") {
    if (typeof o.assetId !== "string") return "Overlay picture is missing.";
    if (doc && doc.assets.find((a) => a.id === o.assetId)?.kind !== "image") return "Overlay picture is not in this project.";
  }
  return null;
}
const findOverlay = (doc: TimelineDoc, id: string) => {
  const o = doc.overlays?.find((x) => x.id === id);
  if (!o) throw new TimelineError("That overlay no longer exists.");
  return o;
};
export function addOverlay(doc: TimelineDoc, input: { kind: "image" | "rect"; assetId?: string; start: number; duration?: number; id?: string; patch?: Partial<Omit<OverlayLayer, "id" | "kind" | "assetId">> }): TimelineDoc {
  if ((doc.overlays?.length ?? 0) >= MAX_OVERLAYS) throw new TimelineError(`A timeline can have at most ${MAX_OVERLAYS} overlays.`);
  const layer: OverlayLayer = {
    id: input.id ?? newId("overlay"), kind: input.kind, ...(input.kind === "image" ? { assetId: input.assetId } : {}),
    start: round3(Math.max(0, input.start)), duration: round3(input.duration ?? 3), x: 0.5, y: 0.5, width: input.kind === "image" ? 0.4 : 0.5, height: input.kind === "image" ? 0.4 : 0.15, opacity: 1, color: "#000000", ...input.patch,
  };
  const problem = validateOverlay(layer, doc);
  if (problem) throw new TimelineError(problem);
  return { ...doc, overlays: [...(doc.overlays ?? []), layer] };
}
export function updateOverlay(doc: TimelineDoc, id: string, patch: Partial<Omit<OverlayLayer, "id" | "kind" | "assetId">>): TimelineDoc {
  const next: OverlayLayer = { ...findOverlay(doc, id), ...patch };
  next.start = round3(next.start); next.duration = round3(next.duration);
  const problem = validateOverlay(next, doc);
  if (problem) throw new TimelineError(problem);
  return { ...doc, overlays: (doc.overlays ?? []).map((o) => (o.id === id ? next : o)) };
}
export function deleteOverlay(doc: TimelineDoc, id: string): TimelineDoc {
  findOverlay(doc, id);
  return { ...doc, overlays: (doc.overlays ?? []).filter((o) => o.id !== id) };
}
export const overlaysAt = (doc: TimelineDoc, time: number) => (doc.overlays ?? []).filter((o) => time >= o.start - 1e-6 && time < o.start + o.duration - 1e-6);
/** Pictures used by overlays (the renderer needs them as sources too). */
export const overlayAssetIds = (doc: TimelineDoc): string[] => [...new Set((doc.overlays ?? []).flatMap((o) => (o.kind === "image" && o.assetId ? [o.assetId] : [])))];

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
  for (const c of d.clips) {
    if (c.volume !== undefined && !(Number.isFinite(c.volume) && c.volume >= 0 && c.volume <= MAX_VOLUME)) errors.push(`Clip ${c.id} has an invalid volume.`);
    for (const f of [c.fadeIn, c.fadeOut]) if (f !== undefined && !(Number.isFinite(f) && f >= 0)) errors.push(`Clip ${c.id} has an invalid fade.`);
    if ((c.fadeIn ?? 0) + (c.fadeOut ?? 0) > clipDuration(c) + 1e-3) errors.push(`Clip ${c.id} has fades longer than the clip.`);
    if (c.fit !== undefined && c.fit !== "fit" && c.fit !== "fill") errors.push(`Clip ${c.id} has an unknown framing option.`);
    if (c.look !== undefined) {
      const l = c.look;
      if (!(l && Number.isFinite(l.brightness) && Number.isFinite(l.contrast) && Number.isFinite(l.saturation) && l.brightness >= -1 && l.brightness <= 1 && l.contrast >= 0 && l.contrast <= 2 && l.saturation >= 0 && l.saturation <= 3)) errors.push(`Clip ${c.id} has invalid colour settings.`);
    }
  }
  errors.push(...validateFilm(d.film));
  if (d.captionStyle !== undefined && !isCaptionStyle(d.captionStyle)) errors.push("Unknown caption style.");
  if (d.texts !== undefined) {
    if (!Array.isArray(d.texts)) errors.push("Text layers are malformed.");
    else {
      if (d.texts.length > MAX_TEXTS) errors.push("Too many text layers.");
      const seen = new Set<string>();
      for (const t of d.texts) {
        const problem = validateTextLayer(t);
        if (problem) errors.push(`Text "${String(t?.text).slice(0, 20)}": ${problem}`);
        if (seen.has(t?.id)) errors.push("Duplicate text id."); else seen.add(t?.id);
      }
    }
  }
  if (d.overlays !== undefined) {
    if (!Array.isArray(d.overlays)) errors.push("Overlays are malformed.");
    else {
      if (d.overlays.length > MAX_OVERLAYS) errors.push("Too many overlays.");
      const seen = new Set<string>();
      for (const o of d.overlays) {
        const problem = validateOverlay(o, d);
        if (problem) errors.push(`Overlay: ${problem}`);
        if (seen.has(o?.id)) errors.push("Duplicate overlay id."); else seen.add(o?.id);
      }
    }
  }
  for (const c of d.clips) { const why = transitionProblem(d, c); if (why) errors.push(`Clip ${c.id}: ${why}.`); }
  for (const c of d.clips) if (c.layer !== undefined) { const why = layerProblem(c.layer); if (why) errors.push(`Clip ${c.id}: ${why}`); }
  if (d.tracks.filter((t) => t.kind === "video").length > MAX_VIDEO_TRACKS) errors.push("Too many video tracks.");
  for (const c of d.clips) if (c.motion !== undefined) { const why = motionProblem(c.motion); if (why) errors.push(`Clip ${c.id}: ${why}`); }
  if (d.aspect !== undefined && !(ASPECT_RATIOS as readonly string[]).includes(d.aspect)) errors.push("The aspect ratio is not supported.");
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
export function commit(h: History, raw: TimelineDoc): History {
  const next = normalizeTransitions(raw);
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

/** Adds a keyframe at progress p, holding the movement as it is there, or moves the one already close to it. */
export function addMotionKey(doc: TimelineDoc, clipId: string, p: number): TimelineDoc {
  const clip = find(doc, clipId);
  if (!clip.motion) throw new TimelineError("Choose a motion first, then add keyframes to it.");
  const at = Math.round(Math.min(1 - MIN_KEY_GAP, Math.max(MIN_KEY_GAP, p)) * 1000) / 1000;
  const pts = motionPoints(clip.motion);
  if (pts.some((k) => Math.abs(k.at - at) < MIN_KEY_GAP - 1e-9)) throw new TimelineError("There is already a keyframe here. Move the playhead to add another.");
  if ((clip.motion.mid?.length ?? 0) >= MAX_MID_KEYS) throw new TimelineError(`A clip can have at most ${MAX_MID_KEYS} extra keyframes.`);
  const here = motionAt(clip.motion, at);
  return setClipMotion(doc, clipId, { ...clip.motion, mid: [...(clip.motion.mid ?? []), { at, ...here }].sort((a, b) => a.at - b.at) });
}
export function updateMotionKey(doc: TimelineDoc, clipId: string, index: number, patch: Partial<MotionKey>): TimelineDoc {
  const clip = find(doc, clipId);
  const mid = clip.motion?.mid;
  if (!clip.motion || !mid || !mid[index]) throw new TimelineError("That keyframe no longer exists.");
  return setClipMotion(doc, clipId, { ...clip.motion, mid: mid.map((k, i) => (i === index ? { ...k, ...patch } : k)) });
}
export function removeMotionKey(doc: TimelineDoc, clipId: string, index: number): TimelineDoc {
  const clip = find(doc, clipId);
  const mid = clip.motion?.mid;
  if (!clip.motion || !mid || !mid[index]) throw new TimelineError("That keyframe no longer exists.");
  const { mid: _m, ...rest } = clip.motion; void _m;
  const left = mid.filter((_, i) => i !== index);
  return setClipMotion(doc, clipId, { ...rest, ...(left.length ? { mid: left } : {}) });
}
