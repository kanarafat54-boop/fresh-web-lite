import { supabase } from "../../../lib/supabase";
import { duplicateName, toProject, validateProjectName, type ProjectCategory, type ProjectStatus, type StudioProject } from "./studioProjectsLogic.js";

export * from "./studioProjectsLogic.js";

const COLUMNS = "id, name, status, metadata, version, updated_at, created_at";

/** Projects need a workspace row (NOT NULL FK). Reuses the owner's studio workspace or creates one. Owner-only RLS. */
async function ensureWorkspace(userId: string): Promise<string> {
  const { data: existing, error } = await supabase.from("fresh_workspaces").select("id").eq("owner_id", userId).eq("kind", "studio").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (existing?.id) return existing.id as string;
  const { data: created, error: createError } = await supabase.from("fresh_workspaces").insert({ owner_id: userId, name: "Fresh Studio", kind: "studio" }).select("id").single();
  if (createError) throw new Error(createError.message);
  return created.id as string;
}

export async function listProjects(userId: string): Promise<StudioProject[]> {
  const { data, error } = await supabase.from("fresh_projects").select(COLUMNS).eq("owner_id", userId).order("updated_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map(toProject);
}

export async function createProject(userId: string, rawName: string, category: ProjectCategory): Promise<StudioProject> {
  const checked = validateProjectName(rawName);
  if (!checked.ok) throw new Error(checked.error);
  const workspaceId = await ensureWorkspace(userId);
  const { data, error } = await supabase.from("fresh_projects").insert({ owner_id: userId, workspace_id: workspaceId, name: checked.name, status: "draft", metadata: { category } }).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return toProject(data as any);
}

/**
 * Versioned update: succeeds only if nobody changed the project since `project.version`, so two devices
 * never silently overwrite each other (spec 15.3). Returns the fresh row.
 */
async function versionedUpdate(project: StudioProject, patch: Record<string, unknown>): Promise<StudioProject> {
  const { data, error } = await supabase.from("fresh_projects").update({ ...patch, version: project.version + 1, updated_at: new Date().toISOString() })
    .eq("id", project.id).eq("version", project.version).select(COLUMNS).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This project changed somewhere else. Reload to see the latest version, then try again.");
  return toProject(data as any);
}

export async function renameProject(project: StudioProject, rawName: string): Promise<StudioProject> {
  const checked = validateProjectName(rawName);
  if (!checked.ok) throw new Error(checked.error);
  return versionedUpdate(project, { name: checked.name });
}

export async function setProjectStatus(project: StudioProject, status: ProjectStatus): Promise<StudioProject> {
  return versionedUpdate(project, { status });
}

export async function duplicateProject(userId: string, project: StudioProject, existingNames: readonly string[]): Promise<StudioProject> {
  const { data: source, error } = await supabase.from("fresh_projects").select("workspace_id, metadata").eq("id", project.id).eq("owner_id", userId).single();
  if (error) throw new Error(error.message);
  const { data, error: insertError } = await supabase.from("fresh_projects").insert({ owner_id: userId, workspace_id: source.workspace_id, name: duplicateName(project.name, existingNames), status: "draft", metadata: source.metadata ?? {} }).select(COLUMNS).single();
  if (insertError) throw new Error(insertError.message);
  return toProject(data as any);
}

const DIRECTOR_KEY = "directorProduction";

/** The owner's most recently updated Director production project, if any. */
export async function findDirectorProject(userId: string): Promise<StudioProject | null> {
  const { data, error } = await supabase.from("fresh_projects").select(COLUMNS).eq("owner_id", userId).not(`metadata->>${DIRECTOR_KEY}`, "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProject(data as any) : null;
}

export async function createDirectorProject(userId: string, name: string, production: unknown): Promise<StudioProject> {
  const workspaceId = await ensureWorkspace(userId);
  const checked = validateProjectName(name);
  const { data, error } = await supabase.from("fresh_projects").insert({ owner_id: userId, workspace_id: workspaceId, name: checked.ok ? checked.name : "Untitled production", status: "planning", metadata: { category: "video", [DIRECTOR_KEY]: production } }).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return toProject(data as any);
}

/** Saves Director content with a version check (conflicts are reported, never overwritten). */
export async function saveDirectorProject(project: StudioProject, name: string, production: unknown): Promise<StudioProject> {
  const checked = validateProjectName(name);
  return versionedUpdate(project, { name: checked.ok ? checked.name : project.name, metadata: { ...project.metadata, category: "video", [DIRECTOR_KEY]: production } });
}

export function directorContent(project: StudioProject): unknown {
  return project.metadata[DIRECTOR_KEY] ?? null;
}

/** Permanent delete. The UI must confirm first (spec 18). Archive is the reversible alternative. */
export async function deleteProject(project: StudioProject): Promise<void> {
  const { error } = await supabase.from("fresh_projects").delete().eq("id", project.id);
  if (error) throw new Error(error.message);
}
