/**
 * Fresh Studio — shared domain model (spec §3, §5, §16).
 * Pure TypeScript: no browser, React or Supabase imports, so it can be tested in Node.
 */

export const STUDIO_MEDIA_KINDS = [
  "video",
  "image",
  "audio",
  "podcast",
  "animation3d",
  "design",
  "live",
  "custom",
] as const;
export type StudioMediaKind = (typeof STUDIO_MEDIA_KINDS)[number];

export const STUDIO_STATUSES = [
  "planning",
  "in_production",
  "editing",
  "review",
  "approved",
  "rendering",
  "ready_to_publish",
  "published",
  "failed",
  "archived",
] as const;
export type StudioStatus = (typeof STUDIO_STATUSES)[number];

export const STATUS_LABELS: Record<StudioStatus, string> = {
  planning: "Planning",
  in_production: "In production",
  editing: "Editing",
  review: "Review",
  approved: "Approved",
  rendering: "Rendering",
  ready_to_publish: "Ready to publish",
  published: "Published",
  failed: "Failed",
  archived: "Archived",
};

export const MEDIA_KIND_LABELS: Record<StudioMediaKind, string> = {
  video: "Video",
  image: "Image / artwork",
  audio: "Music / audio",
  podcast: "Podcast",
  animation3d: "3D / animation",
  design: "Graphic design",
  live: "Live production",
  custom: "Custom project",
};

export type StudioWorkspaceId =
  | "video"
  | "image"
  | "audio"
  | "podcast"
  | "animation"
  | "design"
  | "live"
  | "custom";

export const DEFAULT_WORKSPACE_FOR_KIND: Record<StudioMediaKind, StudioWorkspaceId> = {
  video: "video",
  image: "image",
  audio: "audio",
  podcast: "podcast",
  animation3d: "animation",
  design: "design",
  live: "live",
  custom: "custom",
};

export type StudioSettingValue = string | number | boolean;
export type StudioSettings = Record<string, StudioSettingValue>;

/** Everything Studio stores in fresh_projects.metadata.studio. */
export type StudioProjectMeta = {
  kind: StudioMediaKind;
  status: StudioStatus;
  settings: StudioSettings;
  workspace: StudioWorkspaceId;
  startingPoint: StudioStartingPoint;
  folder: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** ISO timestamp when moved to trash; null when not trashed. */
  deletedAt: string | null;
  /** Status to restore to when un-archiving or restoring from trash. */
  statusBeforeRemoval: StudioStatus | null;
  /** Video timeline (Phase 2). Plain JSON; validated on load, dropped if corrupt. */
  timeline: unknown | null;
  /** Caption cues in timeline time. */
  captions: Array<{ id: string; start: number; end: number; text: string; speaker?: string }>;
};

export const STARTING_POINTS = ["blank", "template", "import", "continue", "ai"] as const;
export type StudioStartingPoint = (typeof STARTING_POINTS)[number];

export type StudioProject = {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  /** Optimistic-concurrency counter (fresh_projects.version). */
  version: number;
  createdAt: string;
  updatedAt: string;
  meta: StudioProjectMeta;
};

export type StudioProjectVersion = {
  id: string;
  projectId: string;
  version: number;
  label: string | null;
  kind: "autosave" | "checkpoint" | "restore";
  snapshot: { name: string; meta: StudioProjectMeta };
  createdAt: string;
};

export function isStudioMediaKind(value: unknown): value is StudioMediaKind {
  return typeof value === "string" && (STUDIO_MEDIA_KINDS as readonly string[]).includes(value);
}

export function isStudioStatus(value: unknown): value is StudioStatus {
  return typeof value === "string" && (STUDIO_STATUSES as readonly string[]).includes(value);
}
