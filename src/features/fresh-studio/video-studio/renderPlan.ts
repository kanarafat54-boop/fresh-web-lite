/**
 * Turns a TimelineDoc into ffmpeg arguments (spec §6.10, §21).
 * Pure and deterministic. It only plans what it can genuinely express: one video track
 * plus mixed music tracks, with trim, split, speed and gaps. Anything else is rejected
 * with a clear message instead of being silently ignored (spec §6.10, §26.7).
 */
import { clipDuration, round3, timelineDuration, trackClips, validateTimeline, type TimelineClip, type TimelineDoc } from "./timeline.ts";

export const EXPORT_PRESETS = [
  { id: "360p", shortSide: 360 },
  { id: "480p", shortSide: 480 },
  { id: "720p", shortSide: 720 },
  { id: "1080p", shortSide: 1080 },
] as const;
export type ExportPresetId = (typeof EXPORT_PRESETS)[number]["id"];

/** Presets from the spec that are intentionally NOT offered, with the reason shown to users. */
export const UNAVAILABLE_PRESETS: ReadonlyArray<{ id: string; reason: string }> = [
  { id: "1440p", reason: "Not verified on the render backend yet." },
  { id: "4K", reason: "Not verified on the render backend yet." },
];

export const PLANNER_MAX_SECONDS = 300;
const AUDIO_RATE = 48000;
const ASPECTS: Record<string, [number, number]> = { "9:16": [9, 16], "16:9": [16, 9], "1:1": [1, 1], "4:5": [4, 5], "21:9": [21, 9] };

export type RenderPlanInput = {
  doc: TimelineDoc;
  preset: ExportPresetId;
  aspectRatio: string;
  /** Local path or URL for each asset id. Must cover every asset used by a clip. */
  sources: Record<string, string>;
  outputPath: string;
  fps?: number;
};

export type RenderPlan =
  | { ok: true; args: string[]; width: number; height: number; fps: number; duration: number; filterGraph: string }
  | { ok: false; errors: string[] };

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export function outputSize(preset: ExportPresetId, aspectRatio: string): { width: number; height: number } | null {
  const p = EXPORT_PRESETS.find((x) => x.id === preset);
  const a = ASPECTS[aspectRatio];
  if (!p || !a) return null;
  const [w, h] = a;
  // The preset names the short side (1080p portrait = 1080 wide).
  return w >= h ? { width: even((p.shortSide * w) / h), height: even(p.shortSide) } : { width: even(p.shortSide), height: even((p.shortSide * h) / w) };
}

/** atempo only accepts 0.5–2, so wider speeds are chained. */
export function atempoChain(speed: number): string[] {
  const out: string[] = [];
  let s = speed;
  while (s > 2 + 1e-9) { out.push("atempo=2"); s /= 2; }
  while (s < 0.5 - 1e-9) { out.push("atempo=0.5"); s /= 0.5; }
  if (Math.abs(s - 1) > 1e-9) out.push(`atempo=${round3(s)}`);
  return out;
}

const num = (n: number) => String(round3(n));

function audioOfClip(label: string, input: number, clip: TimelineClip, hasAudio: boolean, silent: boolean): string {
  const d = clipDuration(clip);
  if (!hasAudio || silent) return `anullsrc=r=${AUDIO_RATE}:cl=stereo,atrim=duration=${num(d)},asetpts=PTS-STARTPTS[${label}]`;
  const chain = [`atrim=start=${num(clip.sourceIn)}:end=${num(clip.sourceOut)}`, "asetpts=PTS-STARTPTS", ...atempoChain(clip.speed), `aresample=${AUDIO_RATE}`, "aformat=sample_fmts=fltp:channel_layouts=stereo"];
  return `[${input}:a]${chain.join(",")}[${label}]`;
}

export function planRender(input: RenderPlanInput): RenderPlan {
  const { doc, preset, aspectRatio, sources, outputPath } = input;
  const errors: string[] = [];
  errors.push(...validateTimeline(doc));
  if (errors.length) return { ok: false, errors };

  const size = outputSize(preset, aspectRatio);
  if (!size) return { ok: false, errors: [`"${preset}" at ${aspectRatio} is not an available export.`] };
  const fps = input.fps ?? doc.fps;
  if (![24, 25, 30, 60].includes(fps)) errors.push("Frame rate must be 24, 25, 30 or 60.");

  const videoTracks = doc.tracks.filter((t) => t.kind === "video");
  const withClips = videoTracks.filter((t) => trackClips(doc, t.id).length > 0);
  const unsupported = doc.tracks.filter((t) => !["video", "music"].includes(t.kind) && trackClips(doc, t.id).length > 0);
  if (unsupported.length) errors.push(`${unsupported.map((t) => t.name).join(", ")} cannot be exported yet.`);
  if (withClips.length > 1) errors.push("Export supports one video track with clips for now. Move all video clips onto one track.");
  if (withClips.length === 0) errors.push("Add at least one video clip before exporting.");
  if (errors.length) return { ok: false, errors };

  const vTrack = withClips[0];
  const vClips = trackClips(doc, vTrack.id);
  const duration = round3(Math.max(...vClips.map((c) => c.start + clipDuration(c))));
  if (duration > PLANNER_MAX_SECONDS) return { ok: false, errors: [`Exports are limited to ${PLANNER_MAX_SECONDS} seconds for now.`] };

  const music = doc.tracks.filter((t) => t.kind === "music" && !t.muted).flatMap((t) => trackClips(doc, t.id));

  // Inputs: one per distinct asset actually used.
  const used = [...new Set([...vClips, ...music].map((c) => c.assetId))];
  const index = new Map<string, number>();
  const args: string[] = ["-y", "-hide_banner", "-nostats"];
  for (const id of used) {
    const src = sources[id];
    if (!src) { errors.push(`The source file for "${doc.assets.find((a) => a.id === id)?.name ?? id}" is not available.`); continue; }
    index.set(id, index.size);
    args.push("-i", src);
  }
  if (errors.length) return { ok: false, errors };

  const { width: W, height: H } = size;
  const filters: string[] = [];
  const vLabels: string[] = [];
  const aLabels: string[] = [];
  let cursor = 0;
  let seg = 0;
  const gap = (len: number) => {
    filters.push(`color=c=black:s=${W}x${H}:r=${fps}:d=${num(len)},setsar=1[g${seg}v]`);
    filters.push(`anullsrc=r=${AUDIO_RATE}:cl=stereo,atrim=duration=${num(len)},asetpts=PTS-STARTPTS[g${seg}a]`);
    vLabels.push(`g${seg}v`); aLabels.push(`g${seg}a`); seg += 1;
  };

  for (const clip of vClips) {
    if (clip.start - cursor > 0.0005) gap(round3(clip.start - cursor));
    const asset = doc.assets.find((a) => a.id === clip.assetId)!;
    const i = index.get(clip.assetId)!;
    const speed = clip.speed === 1 ? "" : `,setpts=(PTS-STARTPTS)/${num(clip.speed)}`;
    filters.push(
      `[${i}:v]trim=start=${num(clip.sourceIn)}:end=${num(clip.sourceOut)},setpts=PTS-STARTPTS${speed},` +
      `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}[c${seg}v]`,
    );
    filters.push(audioOfClip(`c${seg}a`, i, clip, asset.hasAudio, vTrack.muted));
    vLabels.push(`c${seg}v`); aLabels.push(`c${seg}a`);
    cursor = round3(clip.start + clipDuration(clip));
    seg += 1;
  }

  const n = vLabels.length;
  filters.push(`${vLabels.map((l) => `[${l}]`).join("")}concat=n=${n}:v=1:a=0[vout]`);
  filters.push(`${aLabels.map((l) => `[${l}]`).join("")}concat=n=${n}:v=0:a=1[abase]`);

  let audioOut = "abase";
  if (music.length) {
    const mLabels: string[] = [];
    music.forEach((clip, k) => {
      const asset = doc.assets.find((a) => a.id === clip.assetId)!;
      const base = audioOfClip(`mraw${k}`, index.get(clip.assetId)!, clip, asset.hasAudio, false);
      filters.push(base);
      const ms = Math.round(clip.start * 1000);
      filters.push(`[mraw${k}]adelay=${ms}|${ms}[m${k}]`);
      mLabels.push(`[m${k}]`);
    });
    filters.push(`[abase]${mLabels.join("")}amix=inputs=${1 + mLabels.length}:duration=first:normalize=0:dropout_transition=0[amix]`);
    audioOut = "amix";
  }

  const filterGraph = filters.join(";\n");
  args.push(
    "-filter_complex", filterGraph,
    "-map", "[vout]", "-map", `[${audioOut}]`,
    "-t", num(duration),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ar", String(AUDIO_RATE),
    "-movflags", "+faststart",
    outputPath,
  );
  return { ok: true, args, width: W, height: H, fps, duration, filterGraph };
}

export { timelineDuration };
