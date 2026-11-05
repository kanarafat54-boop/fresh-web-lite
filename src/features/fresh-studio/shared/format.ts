import type { StudioProject, StudioMediaKind } from "./types.ts";

export const KIND_GLYPH: Record<StudioMediaKind, string> = {
  video: "▶", image: "▧", audio: "♪", podcast: "◉", animation3d: "◈", design: "✎", live: "●", custom: "✦",
};

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000));
  if (seconds < 45) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "Duration or dimensions where applicable" (spec §3.2). Returns null when neither is known. */
export function projectSizeLabel(project: StudioProject): string | null {
  const { meta } = project;
  if (meta.durationSeconds !== null) return formatDuration(meta.durationSeconds);
  const s = meta.settings;
  if (typeof s.canvasWidth === "number" && typeof s.canvasHeight === "number") return `${s.canvasWidth}×${s.canvasHeight}`;
  if (typeof s.resolution === "string") return `${s.resolution}${typeof s.aspectRatio === "string" ? ` · ${s.aspectRatio}` : ""}`;
  return null;
}
