/**
 * Photo adjustments for Studio image projects. Pure, so the same numbers drive the preview, the export and the saved project.
 * Values live in the project's settings (brightness, contrast, saturation in percent; rotation in degrees).
 */
import type { StudioSettings } from "../shared/types.ts";

export type ImageAdjust = { brightness: number; contrast: number; saturation: number; rotation: 0 | 90 | 180 | 270 };

export const ADJUST_LIMITS = { brightness: [50, 150], contrast: [50, 150], saturation: [0, 180] } as const;
export const DEFAULT_ADJUST: ImageAdjust = { brightness: 100, contrast: 100, saturation: 100, rotation: 0 };

const clamp = (value: unknown, [min, max]: readonly [number, number], fallback: number) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

/** Reads adjustments from project settings; anything missing or out of range falls back safely. Older projects have none. */
export function readAdjust(settings: StudioSettings | Record<string, unknown>): ImageAdjust {
  const s = settings as Record<string, unknown>;
  const turn = ((Math.round(Number(s.rotation) / 90) * 90) % 360 + 360) % 360;
  return {
    brightness: clamp(s.brightness, ADJUST_LIMITS.brightness, 100),
    contrast: clamp(s.contrast, ADJUST_LIMITS.contrast, 100),
    saturation: clamp(s.saturation, ADJUST_LIMITS.saturation, 100),
    rotation: ([0, 90, 180, 270].includes(turn) ? turn : 0) as ImageAdjust["rotation"],
  };
}

export function cssFilter(a: ImageAdjust): string {
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
}

export const rotate = (a: ImageAdjust, direction: "left" | "right"): ImageAdjust => ({ ...a, rotation: ((a.rotation + (direction === "right" ? 90 : 270)) % 360) as ImageAdjust["rotation"] });

/** Size of the exported picture after rotation. A quarter turn swaps width and height. */
export function outputSize(width: number, height: number, rotation: number): { width: number; height: number } {
  return rotation % 180 === 90 ? { width: height, height: width } : { width, height };
}

export function isDefault(a: ImageAdjust): boolean {
  return a.brightness === 100 && a.contrast === 100 && a.saturation === 100 && a.rotation === 0;
}

export function exportFileName(sourceName: string, projectName: string): string {
  const base = (sourceName.replace(/\.[^.]+$/, "") || projectName || "photo").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "photo";
  return `fresh-studio-${base}.png`;
}
