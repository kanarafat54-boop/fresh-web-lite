/**
 * Per-media-kind project settings (spec §5.2).
 * "Only settings relevant to the selected media type should be displayed."
 */
import type { StudioMediaKind, StudioSettings, StudioSettingValue } from "./types.ts";

export type SettingField =
  | { key: string; label: string; type: "select"; options: ReadonlyArray<{ value: string; label: string }>; default: string }
  | { key: string; label: string; type: "number"; min: number; max: number; step?: number; unit?: string; default: number };

const opt = (...values: string[]) => values.map((v) => ({ value: v, label: v }));

const ASPECT = { key: "aspectRatio", label: "Aspect ratio", type: "select", options: opt("9:16", "16:9", "1:1", "4:5", "21:9"), default: "9:16" } as const;
const ORIENTATION = { key: "orientation", label: "Orientation", type: "select", options: opt("portrait", "landscape", "square"), default: "portrait" } as const;
const SAMPLE_RATE = { key: "sampleRate", label: "Audio sample rate (Hz)", type: "select", options: opt("44100", "48000", "96000"), default: "48000" } as const;
const COLOR_SPACE = { key: "colorSpace", label: "Color space", type: "select", options: opt("sRGB", "Display P3", "Rec.709"), default: "sRGB" } as const;

const VIDEO_FIELDS: SettingField[] = [
  ASPECT,
  { key: "resolution", label: "Resolution", type: "select", options: opt("480p", "720p", "1080p"), default: "1080p" },
  { key: "frameRate", label: "Frame rate (fps)", type: "select", options: opt("24", "25", "30", "60"), default: "30" },
  { ...COLOR_SPACE, default: "Rec.709" },
  SAMPLE_RATE,
  ORIENTATION,
];

const FIELDS_BY_KIND: Record<StudioMediaKind, SettingField[]> = {
  video: VIDEO_FIELDS,
  image: [
    { key: "canvasWidth", label: "Canvas width (px)", type: "number", min: 16, max: 8192, default: 1080 },
    { key: "canvasHeight", label: "Canvas height (px)", type: "number", min: 16, max: 8192, default: 1080 },
    COLOR_SPACE,
    ORIENTATION,
  ],
  audio: [SAMPLE_RATE, { key: "tempo", label: "Tempo (BPM)", type: "number", min: 20, max: 300, default: 120 }],
  podcast: [SAMPLE_RATE],
  animation3d: [
    { key: "resolution", label: "Resolution", type: "select", options: opt("540p", "720p", "1080p"), default: "720p" },
    { key: "frameRate", label: "Frame rate (fps)", type: "select", options: opt("24", "30"), default: "24" },
    ASPECT,
  ],
  design: [
    { key: "canvasWidth", label: "Canvas width (px)", type: "number", min: 16, max: 8192, default: 1080 },
    { key: "canvasHeight", label: "Canvas height (px)", type: "number", min: 16, max: 8192, default: 1350 },
    COLOR_SPACE,
  ],
  live: [ASPECT, { key: "resolution", label: "Resolution", type: "select", options: opt("480p", "720p", "1080p"), default: "720p" }],
  custom: [],
};

export function settingFieldsFor(kind: StudioMediaKind): readonly SettingField[] {
  return FIELDS_BY_KIND[kind];
}

export function defaultSettingsFor(kind: StudioMediaKind): StudioSettings {
  const out: StudioSettings = {};
  for (const field of FIELDS_BY_KIND[kind]) out[field.key] = field.default;
  return out;
}

export type SettingsValidation = { ok: true; settings: StudioSettings } | { ok: false; errors: string[] };

/** Validates and normalizes user-supplied settings; drops keys not relevant to the kind. */
export function validateSettings(kind: StudioMediaKind, input: Record<string, unknown>): SettingsValidation {
  const errors: string[] = [];
  const settings: StudioSettings = {};
  for (const field of FIELDS_BY_KIND[kind]) {
    const raw: unknown = input[field.key] ?? field.default;
    if (field.type === "select") {
      const value = String(raw);
      if (!field.options.some((o) => o.value === value)) errors.push(`${field.label}: "${value}" is not available.`);
      else settings[field.key] = value;
    } else {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n) || n < field.min || n > field.max) errors.push(`${field.label} must be between ${field.min} and ${field.max}.`);
      else settings[field.key] = Math.round(n);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, settings };
}

/**
 * Merge a settings change into existing settings without discarding keys that
 * are still relevant (spec §5.3: settings stay editable without destroying work).
 */
export function mergeSettings(kind: StudioMediaKind, current: StudioSettings, patch: Record<string, StudioSettingValue>): SettingsValidation {
  return validateSettings(kind, { ...current, ...patch });
}
