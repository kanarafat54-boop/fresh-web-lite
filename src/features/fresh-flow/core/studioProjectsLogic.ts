/** Pure rules for Fresh Studio projects (spec sections 3, 5, 16.1). No network. */

export const PROJECT_CATEGORIES = [
  { id: "video", label: "Video" },
  { id: "image", label: "Image & artwork" },
  { id: "audio", label: "Music & audio" },
  { id: "podcast", label: "Podcast" },
  { id: "3d", label: "3D & animation" },
  { id: "design", label: "Graphic design" },
  { id: "live", label: "Live production" },
  { id: "custom", label: "Custom" },
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]["id"];

/** Both legacy hyphenated statuses and Studio's underscore statuses are supported. */
export const PROJECT_STATUSES = [
  "draft", "planning", "in-production", "in_production", "editing", "review", "approved", "rendering", "ready-to-publish", "ready_to_publish", "published", "failed", "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft", planning: "Planning", "in-production": "In production", in_production: "In production", editing: "Editing", review: "Review", approved: "Approved",
  rendering: "Rendering", "ready-to-publish": "Ready to publish", ready_to_publish: "Ready to publish", published: "Published", failed: "Failed", archived: "Archived",
};

export type StudioProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  category: ProjectCategory;
  version: number;
  updatedAt: string;
  createdAt: string;
  /** Free-form project content (e.g. the Director production). Never trusted as typed data. */
  metadata: Record<string, unknown>;
};

export function validateProjectName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, error: "Give the project a name." };
  if (name.length > 80) return { ok: false, error: "Project names can be at most 80 characters." };
  return { ok: true, name };
}

export function isStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function isCategory(value: unknown): value is ProjectCategory {
  return typeof value === "string" && PROJECT_CATEGORIES.some((category) => category.id === value);
}

function categoryFromMetadata(metadata: Record<string, unknown>): ProjectCategory {
  if (isCategory(metadata.category)) return metadata.category;
  const studio = metadata.studio && typeof metadata.studio === "object" && !Array.isArray(metadata.studio)
    ? metadata.studio as Record<string, unknown>
    : null;
  const kind = studio?.kind;
  if (kind === "animation3d") return "3d";
  if (isCategory(kind)) return kind;
  return "custom";
}

function statusFromMetadata(metadata: Record<string, unknown>): ProjectStatus | null {
  const studio = metadata.studio && typeof metadata.studio === "object" && !Array.isArray(metadata.studio)
    ? metadata.studio as Record<string, unknown>
    : null;
  const status = studio?.status;
  if (status === "in_production") return "in-production";
  if (status === "ready_to_publish") return "ready-to-publish";
  if (isStatus(status)) return status;
  return null;
}

/** Maps a database row to a project; old and new Studio metadata are both understood. */
export function toProject(row: { id: string; name: string; status: unknown; metadata: unknown; version: unknown; updated_at: string; created_at: string }): StudioProject {
  const metadata = (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {}) as Record<string, unknown>;
  const status = isStatus(row.status) ? row.status : statusFromMetadata(metadata) ?? "draft";
  return {
    id: row.id,
    name: row.name,
    status,
    category: categoryFromMetadata(metadata),
    version: Number(row.version) > 0 ? Number(row.version) : 1,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    metadata,
  };
}

/** "Name (copy)", "Name (copy 2)" ... never exceeding the name limit and never clashing with an existing name. */
export function duplicateName(name: string, existing: readonly string[]): string {
  const taken = new Set(existing.map((item) => item.toLowerCase()));
  const base = name.replace(/ \(copy(?: \d+)?\)$/, "");
  for (let n = 1; n < 1000; n += 1) {
    const suffix = n === 1 ? " (copy)" : ` (copy ${n})`;
    const candidate = `${base.slice(0, 80 - suffix.length)}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base.slice(0, 60)} (copy ${Date.now()})`;
}

export function sortProjects(projects: readonly StudioProject[]): StudioProject[] {
  return [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
