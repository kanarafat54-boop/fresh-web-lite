/**
 * Maps between public.fresh_projects rows and the Studio domain model.
 * Studio reuses fresh_projects (owner-only RLS, version counter) and keeps its own
 * fields under metadata.studio, so no duplicate project system is introduced (spec §20.3).
 */
import {
  DEFAULT_WORKSPACE_FOR_KIND,
  STARTING_POINTS,
  isStudioMediaKind,
  isStudioStatus,
  type StudioProject,
  type StudioProjectMeta,
  type StudioProjectVersion,
  type StudioSettings,
  type StudioStartingPoint,
  type StudioWorkspaceId,
} from "../shared/types.ts";
import { defaultSettingsFor } from "../shared/projectSettings.ts";
import { validateTimeline } from "../video-studio/timeline.ts";

export type FreshProjectRow = {
  id: string;
  workspace_id: string;
  owner_id: string;
  name: string;
  status: string;
  version: number;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

export type StudioVersionRow = {
  id: string;
  project_id: string;
  version: number;
  label: string | null;
  kind: string;
  snapshot: unknown;
  created_at: string;
};

const WORKSPACES: readonly StudioWorkspaceId[] = ["video", "image", "audio", "podcast", "animation", "design", "live", "custom"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseStudioMeta(metadata: unknown): StudioProjectMeta | null {
  if (!isRecord(metadata) || !isRecord(metadata.studio)) return null;
  const s = metadata.studio;
  if (!isStudioMediaKind(s.kind) || !isStudioStatus(s.status)) return null;
  const settings: StudioSettings = {};
  if (isRecord(s.settings)) {
    for (const [k, v] of Object.entries(s.settings)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") settings[k] = v;
    }
  }
  const workspace = WORKSPACES.includes(s.workspace as StudioWorkspaceId) ? (s.workspace as StudioWorkspaceId) : DEFAULT_WORKSPACE_FOR_KIND[s.kind];
  const startingPoint: StudioStartingPoint = (STARTING_POINTS as readonly unknown[]).includes(s.startingPoint) ? (s.startingPoint as StudioStartingPoint) : "blank";
  return {
    kind: s.kind,
    status: s.status,
    settings: Object.keys(settings).length ? settings : defaultSettingsFor(s.kind),
    workspace,
    startingPoint,
    folder: typeof s.folder === "string" && s.folder ? s.folder : null,
    thumbnailUrl: typeof s.thumbnailUrl === "string" ? s.thumbnailUrl : null,
    durationSeconds: typeof s.durationSeconds === "number" && Number.isFinite(s.durationSeconds) ? s.durationSeconds : null,
    deletedAt: typeof s.deletedAt === "string" ? s.deletedAt : null,
    statusBeforeRemoval: isStudioStatus(s.statusBeforeRemoval) ? s.statusBeforeRemoval : null,
    // A corrupt stored timeline must never crash the editor: drop it and start empty.
    timeline: isRecord(s.timeline) && validateTimeline(s.timeline).length === 0 ? s.timeline : null,
    captions: parseStoredCaptions(s.captions),
  };
}

function parseStoredCaptions(value: unknown): StudioProjectMeta["captions"] {
  if (!Array.isArray(value)) return [];
  const out: StudioProjectMeta["captions"] = [];
  for (const c of value.slice(0, 5000)) {
    if (!isRecord(c) || typeof c.id !== "string" || typeof c.text !== "string") continue;
    if (typeof c.start !== "number" || typeof c.end !== "number" || !Number.isFinite(c.start) || !Number.isFinite(c.end) || c.end <= c.start) continue;
    out.push({ id: c.id, start: c.start, end: c.end, text: c.text.slice(0, 400), ...(typeof c.speaker === "string" ? { speaker: c.speaker.slice(0, 30) } : {}) });
  }
  return out;
}

/** Returns null for fresh_projects rows that were not created by Studio. */
export function rowToProject(row: FreshProjectRow): StudioProject | null {
  const meta = parseStudioMeta(row.metadata);
  if (!meta) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    name: row.name,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    meta,
  };
}

/** Merge Studio meta into existing metadata, preserving unrelated keys written by other features. */
export function metaToMetadata(existing: unknown, meta: StudioProjectMeta): Record<string, unknown> {
  const base = isRecord(existing) ? existing : {};
  return { ...base, studio: meta };
}

export function rowToVersion(row: StudioVersionRow): StudioProjectVersion | null {
  if (!isRecord(row.snapshot)) return null;
  const meta = parseStudioMeta({ studio: row.snapshot.meta });
  if (!meta || typeof row.snapshot.name !== "string") return null;
  const kind = row.kind === "checkpoint" || row.kind === "restore" ? row.kind : "autosave";
  return {
    id: row.id,
    projectId: row.project_id,
    version: row.version,
    label: row.label,
    kind,
    snapshot: { name: row.snapshot.name, meta },
    createdAt: row.created_at,
  };
}
