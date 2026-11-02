/**
 * On-device StudioBackend. Used when the user is signed out or Supabase is unreachable,
 * and as the in-memory backend in tests. Projects stored here exist only on this device;
 * the UI must say so (spec §26.7: UI existence does not mean backend completion).
 */
import type { StudioProject, StudioProjectVersion } from "../shared/types.ts";
import { MAX_VERSIONS_KEPT, type NewProjectRecord, type ProjectPatch, type StudioBackend } from "./projectService.ts";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const PROJECTS_KEY = "fresh.studio.projects.v1";
const VERSIONS_KEY = "fresh.studio.project-versions.v1";
export const DEVICE_OWNER_ID = "device";
const DEVICE_WORKSPACE_ID = "device-workspace";

function readList<T>(store: KeyValueStore, key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function createDeviceBackend(
  store: KeyValueStore,
  newId: () => string = () => globalThis.crypto.randomUUID(),
  now: () => Date = () => new Date(),
): StudioBackend {
  const readProjects = () => readList<StudioProject>(store, PROJECTS_KEY);
  const writeProjects = (list: StudioProject[]) => store.setItem(PROJECTS_KEY, JSON.stringify(list));
  const readVersions = () => readList<StudioProjectVersion>(store, VERSIONS_KEY);
  const writeVersions = (list: StudioProjectVersion[]) => store.setItem(VERSIONS_KEY, JSON.stringify(list));

  return {
    kind: "device",

    async listProjects() {
      return readProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getProject(id) {
      return readProjects().find((p) => p.id === id) ?? null;
    },

    async insertProject(record: NewProjectRecord) {
      const stamp = now().toISOString();
      const project: StudioProject = {
        id: newId(), workspaceId: DEVICE_WORKSPACE_ID, ownerId: DEVICE_OWNER_ID,
        name: record.name, version: 1, createdAt: stamp, updatedAt: stamp, meta: record.meta,
      };
      writeProjects([project, ...readProjects()]);
      return project;
    },

    async updateProject(id, expectedVersion, patch: ProjectPatch) {
      const list = readProjects();
      const index = list.findIndex((p) => p.id === id);
      if (index < 0 || list[index].version !== expectedVersion) return null;
      const current = list[index];
      const next: StudioProject = {
        ...current,
        name: patch.name ?? current.name,
        meta: patch.meta ?? current.meta,
        version: current.version + 1,
        updatedAt: now().toISOString(),
      };
      list[index] = next;
      writeProjects(list);
      return next;
    },

    async deleteProject(id) {
      writeProjects(readProjects().filter((p) => p.id !== id));
      writeVersions(readVersions().filter((v) => v.projectId !== id));
    },

    async listVersions(projectId) {
      return readVersions()
        .filter((v) => v.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.version - a.version);
    },

    async insertVersion(input) {
      const version: StudioProjectVersion = { ...input, id: newId(), createdAt: now().toISOString() };
      const all = [version, ...readVersions()];
      // Keep every checkpoint/restore point; prune only the oldest autosaves of this project.
      const autosaves = all.filter((v) => v.projectId === input.projectId && v.kind === "autosave");
      const drop = new Set(autosaves.slice(MAX_VERSIONS_KEPT).map((v) => v.id));
      writeVersions(all.filter((v) => !drop.has(v.id)));
      return version;
    },
  };
}
