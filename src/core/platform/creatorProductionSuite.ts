/**
 * Creator Production Suite — real starter functionality for FWL Creator + Studio.
 * Maps the 5-pillar production architecture onto live surfaces.
 * Massive underneath · minimal on the surface.
 */

export type DistributionChannel =
  | "fresh-long"
  | "fresh-short"
  | "fresh-live"
  | "premiere"
  | "podcast-rss"
  | "external-schedule";

export type DistributionTarget = {
  channel: DistributionChannel;
  label: string;
  enabled: boolean;
  scheduledAt?: string | null;
};

export const DISTRIBUTION_CHANNELS: Array<{ channel: DistributionChannel; label: string; note: string }> = [
  { channel: "fresh-long", label: "Long-form", note: "Fresh Flow Long / posts" },
  { channel: "fresh-short", label: "Vertical Shorts", note: "Fresh Flow Short" },
  { channel: "fresh-live", label: "Live stream", note: "Live control room" },
  { channel: "premiere", label: "Premiere", note: "Scheduled release" },
  { channel: "podcast-rss", label: "Podcast RSS", note: "Episode feed" },
  { channel: "external-schedule", label: "External schedule", note: "Queue for external rails" },
];

export type AbVariant = {
  id: string;
  label: "A" | "B" | "C";
  title: string;
  hook: string;
  thumbnailUrl?: string | null;
};

export type ViralPrediction = {
  viralProbability: number;
  ctrRange: [number, number];
  dropOffRisk: number;
  regionHints: string[];
  notes: string[];
};

export type RetentionPoint = { second: number; retained: number };

export type BrandKit = {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  fontHeading: string;
  fontBody: string;
  watermarkText: string;
};

const BRAND_KEY = "fresh.creator.brandKit";
const DIST_KEY = "fresh.creator.distribution";
const AB_KEY = "fresh.creator.abVariants";
const SCHEDULE_KEY = "fresh.creator.scheduleQueue";

export const DEFAULT_BRAND_KIT: BrandKit = {
  name: "My channel",
  primaryColor: "#2563eb",
  secondaryColor: "#0f172a",
  accentColor: "#22c55e",
  logoUrl: "",
  fontHeading: "Inter",
  fontBody: "Inter",
  watermarkText: "",
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function loadBrandKit(): BrandKit {
  return { ...DEFAULT_BRAND_KIT, ...readJson(BRAND_KEY, {}) };
}

export function saveBrandKit(kit: BrandKit): BrandKit {
  writeJson(BRAND_KEY, kit);
  return kit;
}

export function loadDistributionTargets(): DistributionTarget[] {
  const saved = readJson<DistributionTarget[] | null>(DIST_KEY, null);
  if (saved?.length) return saved;
  return DISTRIBUTION_CHANNELS.map((c) => ({
    channel: c.channel,
    label: c.label,
    enabled: c.channel === "fresh-short" || c.channel === "fresh-long",
    scheduledAt: null,
  }));
}

export function saveDistributionTargets(targets: DistributionTarget[]) {
  writeJson(DIST_KEY, targets);
}

export type ScheduleItem = {
  id: string;
  title: string;
  channels: DistributionChannel[];
  scheduledAt: string;
  status: "queued" | "published" | "cancelled";
  createdAt: string;
};

export function loadScheduleQueue(): ScheduleItem[] {
  return readJson(SCHEDULE_KEY, []);
}

export function enqueueSchedule(input: {
  title: string;
  channels: DistributionChannel[];
  scheduledAt: string;
}): ScheduleItem {
  const item: ScheduleItem = {
    id: crypto.randomUUID(),
    title: input.title.trim() || "Untitled release",
    channels: input.channels,
    scheduledAt: input.scheduledAt,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...loadScheduleQueue()].slice(0, 40);
  writeJson(SCHEDULE_KEY, next);
  return item;
}

export function loadAbVariants(): AbVariant[] {
  return readJson(AB_KEY, [
    { id: "va", label: "A", title: "", hook: "", thumbnailUrl: null },
    { id: "vb", label: "B", title: "", hook: "", thumbnailUrl: null },
    { id: "vc", label: "C", title: "", hook: "", thumbnailUrl: null },
  ]);
}

export function saveAbVariants(variants: AbVariant[]) {
  writeJson(AB_KEY, variants);
}

/** Heuristic pre-publish predictor — real model adapters plug in later. */
export function predictViralPerformance(input: {
  caption: string;
  hasMedia: boolean;
  isShort: boolean;
  durationSeconds?: number;
  followerCount?: number;
}): ViralPrediction {
  const text = input.caption.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const hashtags = (text.match(/#\w+/g) ?? []).length;
  const hasQuestion = /\?/.test(text);
  const hasCta = /(subscribe|follow|comment|share|watch|link)/i.test(text);

  let score = 0.22;
  if (input.hasMedia) score += 0.18;
  if (input.isShort) score += 0.12;
  if (words >= 6 && words <= 28) score += 0.1;
  if (hashtags >= 1 && hashtags <= 4) score += 0.08;
  if (hasQuestion) score += 0.05;
  if (hasCta) score += 0.06;
  if ((input.followerCount ?? 0) > 100) score += 0.08;
  if ((input.durationSeconds ?? 0) > 0 && (input.durationSeconds ?? 0) < 45) score += 0.07;
  score = Math.max(0.05, Math.min(0.92, score));

  const ctrLow = Math.round((score * 2.2 + 0.8) * 10) / 10;
  const ctrHigh = Math.round((score * 5.5 + 1.4) * 10) / 10;
  const dropOff = Math.max(0.12, Math.min(0.78, 0.55 - score * 0.25 + (words > 40 ? 0.1 : 0)));

  const notes: string[] = [];
  if (!input.hasMedia) notes.push("Add media — strongest CTR lift.");
  if (words < 5) notes.push("Hook is thin — open with a concrete claim or question.");
  if (hashtags > 5) notes.push("Too many hashtags can dilute discovery.");
  if (input.isShort && (input.durationSeconds ?? 0) > 60) notes.push("Shorts retain better under ~60s.");
  if (!notes.length) notes.push("Solid baseline — A/B the first 3 seconds and thumbnail.");

  return {
    viralProbability: Math.round(score * 100) / 100,
    ctrRange: [ctrLow, ctrHigh],
    dropOffRisk: Math.round(dropOff * 100) / 100,
    regionHints: score > 0.55 ? ["EN global", "UG / EA", "Creator niches"] : ["Core followers", "Local"],
    notes,
  };
}

/** Build a simple retention curve from available analytics counts. */
export function buildRetentionCurve(analytics: Record<string, number | null | undefined>): RetentionPoint[] {
  const views = Number(analytics.short_views ?? analytics.post_count ?? 0) || 100;
  const likes = Number(analytics.short_likes ?? analytics.post_likes ?? 0);
  const reposts = Number(analytics.short_reposts ?? 0);
  const engage = Math.min(0.85, (likes + reposts * 2) / Math.max(views, 1));
  const base = 0.92;
  const points: RetentionPoint[] = [];
  for (let s = 0; s <= 30; s += 5) {
    const t = s / 30;
    const retained = Math.max(0.08, base * Math.exp(-1.1 * t) * (0.7 + engage));
    points.push({ second: s, retained: Math.round(retained * 100) / 100 });
  }
  return points;
}

export type SearchGapIdea = { topic: string; gapScore: number; format: string; reason: string };

/** Local search-gap inspiration from caption/topic seeds — remote keyword APIs later. */
export function suggestSearchGaps(seed: string, analytics: Record<string, number | null | undefined>): SearchGapIdea[] {
  const base = seed.trim() || "Fresh creator workflow";
  const shortHeavy = Number(analytics.short_count ?? 0) >= Number(analytics.post_count ?? 0);
  const ideas: SearchGapIdea[] = [
    {
      topic: `${base} for beginners`,
      gapScore: 0.78,
      format: shortHeavy ? "Long explainer" : "Short series",
      reason: "Beginner intent is underserved relative to advanced posts.",
    },
    {
      topic: `Common mistakes in ${base}`,
      gapScore: 0.71,
      format: "Vertical Short",
      reason: "Mistake/list formats drive early retention and saves.",
    },
    {
      topic: `${base} vs alternatives`,
      gapScore: 0.66,
      format: "Comparison long-form",
      reason: "Comparison queries convert when product density is low.",
    },
    {
      topic: `Behind the scenes: ${base}`,
      gapScore: 0.62,
      format: "Live / Stories",
      reason: "Process content fills the authenticity gap in feeds.",
    },
  ];
  return ideas;
}

export type AudioLane = { id: string; name: string; gain: number; muted: boolean };

export function defaultAudioLanes(): AudioLane[] {
  return [
    { id: "vocals", name: "Vocals", gain: 1, muted: false },
    { id: "music", name: "Music", gain: 0.7, muted: false },
    { id: "drums", name: "Drums", gain: 0.8, muted: false },
    { id: "ambient", name: "Ambient", gain: 0.5, muted: false },
  ];
}

export type LiveControlState = {
  streamKeySet: boolean;
  chatModeration: boolean;
  multiHost: boolean;
  gifting: boolean;
  status: "idle" | "ready" | "live";
};

export function defaultLiveControl(): LiveControlState {
  return {
    streamKeySet: false,
    chatModeration: true,
    multiHost: false,
    gifting: true,
    status: "idle",
  };
}

/** Fit map for the 5 production pillars. */
export const CREATOR_PRODUCTION_PILLARS = [
  {
    id: "dashboard",
    title: "Dashboard · Analytics · Multi-platform",
    fwl: "Creator Studio · Publish + Analytics + Distribute tabs",
  },
  {
    id: "timeline",
    title: "Multi-track timeline & intelligent editing",
    fwl: "Studio Edit · render graph · WebGPU/WASM path",
  },
  {
    id: "design",
    title: "Graphic design · branding · assets",
    fwl: "Creator Design tab · brand kit",
  },
  {
    id: "audio",
    title: "Audio engineering · voice",
    fwl: "Creator Audio tab · Studio stems · local speech",
  },
  {
    id: "monetize",
    title: "Monetization · rights · community",
    fwl: "Creator Monetize · escrow · copyright · signal comments",
  },
] as const;
