/**
 * Studio project service: validation, lifecycle and optimistic concurrency.
 * Storage is injected (StudioBackend) so the same rules run against Supabase,
 * the on-device fallback, and an in-memory backend in tests.
 */
import {
  DEFAULT_WORKSPACE_FOR_KIND,
  isStudioMediaKind,
  isStudioStatus,
  type StudioMediaKind,
  type StudioProject,
  type StudioProjectMeta,
  type StudioProjectVersion,
  type StudioSettings,
  type StudioStartingPoint,
  type StudioStatus,
} from "../shared/types.ts";
import { defaultSettingsFor, mergeSettings, validateSettings } from "../shared/projectSettings.ts";

/** Thrown when the stored version no longer matches the version the caller edited (spec §15.3). */
export class StudioConflictError extends Error {
  readonly current: StudioProject | null;
  constructor(current: StudioProject | null) {
    super("This project changed somewhere else. Reload it before saving again.");
    this.name = "StudioConflictError";
    this.current = current;
  }
}

export class StudioValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(errors.join(" "));
    this.name = "StudioValidationError";
    this.errors = errors;
  }
}

export type NewProjectRecord = { name: string; meta: StudioProjectMeta };
export type ProjectPatch = { name?: string; meta?: StudioProjectMeta };

export interface StudioBackend {
  readonly kind: "supabase" | "device";
  listProjects(): Promise<StudioProject[]>;
  getProject(id: string): Promise<StudioProject | null>;
  insertProject(record: NewProjectRecord): Promise<StudioProject>;
  /** Must succeed only if the stored version equals expectedVersion, then bump it; otherwise return null. */
  updateProject(id: string, expectedVersion: number, patch: ProjectPatch): Promise<StudioProject | null>;
  /** Permanently removes a project (only used for emptying trash). */
  deleteProject(id: string): Promise<void>;
  listVersions(projectId: string): Promise<StudioProjectVersion[]>;
  insertVersion(input: Omit<StudioProjectVersion, "id" | "createdAt">): Promise<StudioProjectVersion>;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_VERSIONS_KEPT = 50;
/** Trash is kept this long before it may be emptied automatically. */
export const TRASH_RETENTION_DAYS = 30;

export function normalizeName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name) throw new StudioValidationError(["Give the project a name."]);
  if (name.length > MAX_NAME_LENGTH) throw new StudioValidationError([`Names can be at most ${MAX_NAME_LENGTH} characters.`]);
  return name;
}

export type CreateProjectInput = {
  name: string;
  kind: StudioMediaKind;
  settings?: Record<string, unknown>;
  startingPoint?: StudioStartingPoint;
  folder?: string | null;
  durationSeconds?: number | null;
};

function blankMeta(kind: StudioMediaKind, settings: StudioSettings, startingPoint: StudioStartingPoint, folder: string | null, durationSeconds: number | null): StudioProjectMeta {
  return {
    kind,
    status: "planning",
    settings,
    workspace: DEFAULT_WORKSPACE_FOR_KIND[kind],
    startingPoint,
    folder,
    thumbnailUrl: null,
    durationSeconds,
    deletedAt: null,
    statusBeforeRemoval: null,
  };
}

/** A project is in the trash when deletedAt is set. Archived projects are not trashed. */
export const isTrashed = (p: StudioProject) => p.meta.deletedAt !== null;
export const isArchived = (p: StudioProject) => p.meta.status === "archived" && !isTrashed(p);
export const isActive = (p: StudioProject) => !isTrashed(p) && p.meta.status !== "archived";

export function createStudioProjectService(backend: StudioBackend, now: () => Date = () => new Date()) {
  async function mutate(project: StudioProject, patch: ProjectPatch): Promise<StudioProject> {
    const next = await backend.updateProject(project.id, project.version, patch);
    if (!next) throw new StudioConflictError(await backend.getProject(project.id));
    return next;
  }

  async function snapshot(project: StudioProject, kind: StudioProjectVersion["kind"], label: string | null) {
    const version = await backend.insertVersion({
      projectId: project.id,
      version: project.version,
      label,
      kind,
      snapshot: { name: project.name, meta: project.meta },
    });
    return version;
  }

  return {
    backendKind: backend.kind,

    list: () => backend.listProjects(),
    get: (id: string) => backend.getProject(id),

    async create(input: CreateProjectInput): Promise<StudioProject> {
      if (!isStudioMediaKind(input.kind)) throw new StudioValidationError(["Choose what you want to create."]);
      const name = normalizeName(input.name);
      const validated = validateSettings(input.kind, { ...defaultSettingsFor(input.kind), ...(input.settings ?? {}) });
      if (!validated.ok) throw new StudioValidationError(validated.errors);
      const folder = input.folder?.trim() ? input.folder.trim().slice(0, 80) : null;
      const duration = typeof input.durationSeconds === "number" && input.durationSeconds >= 0 ? input.durationSeconds : null;
      return backend.insertProject({ name, meta: blankMeta(input.kind, validated.settings, input.startingPoint ?? "blank", folder, duration) });
    },

    rename: (project: StudioProject, name: string) => mutate(project, { name: normalizeName(name) }),

    async setStatus(project: StudioProject, status: StudioStatus) {
      if (!isStudioStatus(status)) throw new StudioValidationError(["Unknown status."]);
      if (isTrashed(project)) throw new StudioValidationError(["Restore this project from the trash first."]);
      return mutate(project, { meta: { ...project.meta, status } });
    },

    async updateSettings(project: StudioProject, patch: Record<string, string | number | boolean>) {
      const merged = mergeSettings(project.meta.kind, project.meta.settings, patch);
      if (!merged.ok) throw new StudioValidationError(merged.errors);
      return mutate(project, { meta: { ...project.meta, settings: merged.settings } });
    },

    /** One validated save for the details form: a single version bump for name + settings + status. */
    async update(project: StudioProject, changes: { name?: string; settings?: Record<string, string | number | boolean>; status?: StudioStatus }) {
      if (isTrashed(project)) throw new StudioValidationError(["Restore this project from the trash first."]);
      let meta = project.meta;
      if (changes.settings) {
        const merged = mergeSettings(meta.kind, meta.settings, changes.settings);
        if (!merged.ok) throw new StudioValidationError(merged.errors);
        meta = { ...meta, settings: merged.settings };
      }
      if (changes.status !== undefined) {
        if (!isStudioStatus(changes.status)) throw new StudioValidationError(["Unknown status."]);
        meta = { ...meta, status: changes.status };
      }
      return mutate(project, { name: changes.name !== undefined ? normalizeName(changes.name) : undefined, meta });
    },

    moveToFolder: (project: StudioProject, folder: string | null) =>
      mutate(project, { meta: { ...project.meta, folder: folder?.trim() ? folder.trim().slice(0, 80) : null } }),

    async duplicate(project: StudioProject): Promise<StudioProject> {
      const copyName = `${project.name} (copy)`.slice(0, MAX_NAME_LENGTH);
      return backend.insertProject({
        name: copyName,
        meta: { ...project.meta, status: "planning", deletedAt: null, statusBeforeRemoval: null },
      });
    },

    archive(project: StudioProject) {
      if (isTrashed(project) || project.meta.status === "archived") return Promise.resolve(project);
      return mutate(project, { meta: { ...project.meta, status: "archived", statusBeforeRemoval: project.meta.status } });
    },

    /** Soft delete: moves to trash; nothing is destroyed until the trash is emptied. */
    moveToTrash(project: StudioProject) {
      if (isTrashed(project)) return Promise.resolve(project);
      return mutate(project, {
        meta: {
          ...project.meta,
          deletedAt: now().toISOString(),
          statusBeforeRemoval: project.meta.status === "archived" ? project.meta.statusBeforeRemoval : project.meta.status,
        },
      });
    },

    /** Restores from trash or from archive. */
    restore(project: StudioProject) {
      if (!isTrashed(project) && project.meta.status !== "archived") return Promise.resolve(project);
      const status = project.meta.statusBeforeRemoval ?? "planning";
      return mutate(project, { meta: { ...project.meta, status, deletedAt: null, statusBeforeRemoval: null } });
    },

    /** Permanent deletion; only allowed for projects already in the trash. */
    async deleteForever(project: StudioProject) {
      if (!isTrashed(project)) throw new StudioValidationError(["Move the project to the trash before deleting it forever."]);
      await backend.deleteProject(project.id);
    },

    /** Records a version. Autosave snapshots are pruned; checkpoints are kept. */
    async checkpoint(project: StudioProject, label: string | null = null): Promise<StudioProjectVersion> {
      return snapshot(project, label ? "checkpoint" : "autosave", label?.trim() || null);
    },

    listVersions: (projectId: string) => backend.listVersions(projectId),

    /** Restores an earlier snapshot as a new version; the current state is kept as a version first. */
    async restoreVersion(project: StudioProject, target: StudioProjectVersion): Promise<StudioProject> {
      if (target.projectId !== project.id) throw new StudioValidationError(["That version belongs to a different project."]);
      await snapshot(project, "restore", `Before restoring v${target.version}`);
      return mutate(project, { name: target.snapshot.name, meta: { ...target.snapshot.meta, deletedAt: null } });
    },
  };
}

export type StudioProjectService = ReturnType<typeof createStudioProjectService>;
