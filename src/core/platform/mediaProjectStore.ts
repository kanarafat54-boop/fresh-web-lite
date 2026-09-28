export type FreshMediaProjectStatus = "draft" | "queued" | "processing" | "ready" | "failed";

export type FreshMediaProject = {
  id: string;
  title: string;
  sourceName: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  renderDocument: unknown;
  pipelineStatus: FreshMediaProjectStatus;
  updatedAt: string;
};

const STORAGE_KEY = "fresh-media-projects-v1";

function readAll(): FreshMediaProject[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeAll(projects: FreshMediaProject[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function listMediaProjects(): FreshMediaProject[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveMediaProject(project: FreshMediaProject): FreshMediaProject {
  writeAll([project, ...readAll().filter((item) => item.id !== project.id)]);
  return project;
}

export function createMediaProject(title = "Untitled Fresh project", renderDocument: unknown = null): FreshMediaProject {
  return {
    id: crypto.randomUUID(),
    title,
    sourceName: null,
    sourceType: null,
    sourceUrl: null,
    renderDocument,
    pipelineStatus: "draft",
    updatedAt: new Date().toISOString(),
  };
}

export function updateMediaProject(id: string, patch: Partial<FreshMediaProject>): FreshMediaProject | null {
  const current = readAll().find((item) => item.id === id);
  if (!current) return null;
  return saveMediaProject({ ...current, ...patch, updatedAt: new Date().toISOString() });
}
