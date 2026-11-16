/**
 * Maps public.fresh_projects rows into the Studio domain model.
 *
 * The table is shared with Fresh Flow's earlier project service. New Studio
 * records live under metadata.studio; older Fresh Flow records use
 * metadata.category. Both formats are read without rewriting or dropping
 * unrelated metadata, so existing projects remain visible during migration.
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

function legacyKind(value: unknown): StudioProjectMeta["kind"] | null {
  if (isStudioMediaKind(value)) return value;
  if (value === "3d") return "animation3d";
  return null;
}

function legacyStatus(value: unknown): StudioProjectMeta["status"] {
  if (isStudioStatus(value)) return value;
  switch (value) {
    case "draft": return "planning";
    case "in-production":
    case "in_production": return "in_production";
    case "ready-to-publish":
    case "ready_to_publish": return "ready_to_publish";
    case "editing": return "editing";
    case "review": return "review";
    case "approved": return "approved";
    case "rendering": return "rendering";
    case "published": return "published";
    case "failed": return "failed";
    case "archived": return "archived";
    default: return "planning";
  }
}

/**
 * Reads either metadata.studio or the legacy Fresh Flow metadata.category.
 * legacyRowStatus is the top-level fresh_projects.status column.
 */
export function parseStudioMeta(metadata: unknown, legacyRowStatus?: unknown): StudioProjectMeta | null {
  if (!isRecord(metadata)) return null;
  const stored = isRecord(metadata.studio) ? metadata.studio : null;
  const kind = legacyKind(stored?.kind) ?? legacyKind(metadata.category);
  if (!kind) return null;

  const settings: StudioSettings = {};
  const rawSettings = stored?.settings;
  if (isRecord(rawSettings)) {
    for (const [key, value] of Object.entries(rawSettings)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") settings[key] = value;
    }
  }

  const rawWorkspace = stored?.workspace;
  const workspace = WORKSPACES.includes(rawWorkspace as StudioWorkspaceId)
    ? rawWorkspace as StudioWorkspaceId
    : DEFAULT_WORKSPACE_FOR_KIND[kind];
  const rawStartingPoint = stored?.startingPoint;
  const startingPoint: StudioStartingPoint = (STARTING_POINTS as readonly unknown[]).includes(rawStartingPoint)
    ? rawStartingPoint as StudioStartingPoint
    : "blank";
  const rawStatus = stored?.status;
  const status = isStudioStatus(rawStatus) ? rawStatus : legacyStatus(legacyRowStatus ?? metadata.status);

  return {
    kind,
    status,
    settings: Object.keys(settings).length ? settings : defaultSettingsFor(kind),
    workspace,
    startingPoint,
    folder: typeof stored?.folder === "string" && stored.folder ? stored.folder : null,
    thumbnailUrl: typeof stored?.thumbnailUrl === "string" ? stored.thumbnailUrl : null,
    durationSeconds: typeof stored?.durationSeconds === "number" && Number.isFinite(stored.durationSeconds) ? stored.durationSeconds : null,
    deletedAt: typeof stored?.deletedAt === "string" ? stored.deletedAt : null,
    statusBeforeRemoval: isStudioStatus(stored?.statusBeforeRemoval) ? stored.statusBeforeRemoval : null,
    // A corrupt stored timeline must never crash the editor: drop it and start empty.
    timeline: isRecord(stored?.timeline) && validateTimeline(stored.timeline).length === 0 ? stored.timeline : null,
    captions: parseStoredCaptions(stored?.captions),
  };
}

function parseStoredCaptions(value: unknown): StudioProjectMeta["captions"] {
  if (!Array.isArray(value)) return [];
  const out: StudioProjectMeta["captions"] = [];
  for (const cue of value.slice(0, 5000)) {
    if (!isRecord(cue) || typeof cue.id !== "string" || typeof cue.text !== "string") continue;
    if (typeof cue.start !== "number" || typeof cue.end !== "number" || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.end <= cue.start) continue;
    out.push({
      id: cue.id,
      start: cue.start,
      end: cue.end,
      text: cue.text.slice(0, 400),
      ...(typeof cue.speaker === "string" ? { speaker: cue.speaker.slice(0, 30) } : {}),
    });
  }
  return out;
}

/** Returns null only for rows that have no recognized Studio/Fresh Flow project kind. */
export function rowToProject(row: FreshProjectRow): StudioProject | null {
  const meta = parseStudioMeta(row.metadata, row.status);
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

/** Merge Studio meta into existing metadata, preserving legacy category and other feature keys. */
export function metaToMetadata(existing: unknown, meta: StudioProjectMeta): Record<string, unknown> {
  const base = isRecord(existing) ? existing : {};
  return { ...base, studio: meta, category: base.category ?? (meta.kind === "animation3d" ? "3d" : meta.kind) };
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
