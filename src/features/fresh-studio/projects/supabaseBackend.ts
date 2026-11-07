/**
 * Supabase StudioBackend.
 * - Projects live in public.fresh_projects (owner-only RLS) under metadata.studio.
 * - Versions live in public.studio_project_versions (see supabase/migrations/20261102100000_studio_project_versions.sql).
 * Row access is enforced by RLS; this file never uses a service key.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudioProject, StudioProjectVersion } from "../shared/types.ts";
import { MAX_VERSIONS_KEPT, type NewProjectRecord, type ProjectPatch, type StudioBackend } from "./projectService.ts";
import { metaToMetadata, rowToProject, rowToVersion, type FreshProjectRow, type StudioVersionRow } from "./projectMapping.ts";

const PROJECT_COLUMNS = "id, workspace_id, owner_id, name, status, version, metadata, created_at, updated_at";
const VERSION_COLUMNS = "id, project_id, version, label, kind, snapshot, created_at";
const LIST_LIMIT = 500;

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
}

export async function getSignedInUserId(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export function createSupabaseBackend(client: SupabaseClient, ownerId: string): StudioBackend {
  let workspaceId: string | null = null;

  async function ensureWorkspace(): Promise<string> {
    if (workspaceId) return workspaceId;
    const found = await client
      .from("fresh_workspaces")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("kind", "studio")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (found.error) fail("Could not load your Studio workspace", found.error);
    if (found.data?.id) return (workspaceId = found.data.id as string);
    const created = await client
      .from("fresh_workspaces")
      .insert({ owner_id: ownerId, name: "Fresh Studio", kind: "studio" })
      .select("id")
      .single();
    if (created.error) fail("Could not create your Studio workspace", created.error);
    return (workspaceId = created.data.id as string);
  }

  return {
    kind: "supabase",

    async listProjects() {
      const { data, error } = await client
        .from("fresh_projects")
        .select(PROJECT_COLUMNS)
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false })
        .limit(LIST_LIMIT);
      if (error) fail("Could not load projects", error);
      return ((data ?? []) as FreshProjectRow[]).map(rowToProject).filter((p): p is StudioProject => p !== null);
    },

    async getProject(id) {
      const { data, error } = await client.from("fresh_projects").select(PROJECT_COLUMNS).eq("id", id).eq("owner_id", ownerId).maybeSingle();
      if (error) fail("Could not load the project", error);
      return data ? rowToProject(data as FreshProjectRow) : null;
    },

    async insertProject(record: NewProjectRecord) {
      const workspace = await ensureWorkspace();
      const { data, error } = await client
        .from("fresh_projects")
        .insert({
          workspace_id: workspace,
          owner_id: ownerId,
          name: record.name,
          status: record.meta.status,
          metadata: metaToMetadata({}, record.meta),
        })
        .select(PROJECT_COLUMNS)
        .single();
      if (error) fail("Could not create the project", error);
      const project = rowToProject(data as FreshProjectRow);
      if (!project) throw new Error("The created project could not be read back.");
      return project;
    },

    async updateProject(id, expectedVersion, patch: ProjectPatch) {
      // Read the current row at the expected version so metadata written by other features is preserved.
      const current = await client
        .from("fresh_projects")
        .select("name, metadata")
        .eq("id", id)
        .eq("owner_id", ownerId)
        .eq("version", expectedVersion)
        .maybeSingle();
      if (current.error) fail("Could not check the project version", current.error);
      if (!current.data) return null;

      const update: Record<string, unknown> = { version: expectedVersion + 1, updated_at: new Date().toISOString() };
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.meta) {
        update.metadata = metaToMetadata(current.data.metadata, patch.meta);
        update.status = patch.meta.status;
      }
      // The version filter makes this a compare-and-swap: a concurrent writer causes zero rows to match.
      const { data, error } = await client
        .from("fresh_projects")
        .update(update)
        .eq("id", id)
        .eq("owner_id", ownerId)
        .eq("version", expectedVersion)
        .select(PROJECT_COLUMNS)
        .maybeSingle();
      if (error) fail("Could not save the project", error);
      return data ? rowToProject(data as FreshProjectRow) : null;
    },

    async deleteProject(id) {
      const { error } = await client.from("fresh_projects").delete().eq("id", id).eq("owner_id", ownerId);
      if (error) fail("Could not delete the project", error);
    },

    async listVersions(projectId) {
      const { data, error } = await client
        .from("studio_project_versions")
        .select(VERSION_COLUMNS)
        .eq("project_id", projectId)
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) fail("Could not load version history", error);
      return ((data ?? []) as StudioVersionRow[]).map(rowToVersion).filter((v): v is StudioProjectVersion => v !== null);
    },

    async insertVersion(input) {
      const { data, error } = await client
        .from("studio_project_versions")
        .insert({
          project_id: input.projectId,
          owner_id: ownerId,
          version: input.version,
          label: input.label,
          kind: input.kind,
          snapshot: input.snapshot,
        })
        .select(VERSION_COLUMNS)
        .single();
      if (error) fail("Could not record a version", error);
      const version = rowToVersion(data as StudioVersionRow);
      if (!version) throw new Error("The recorded version could not be read back.");

      // Prune only old autosaves; checkpoints and restore points are kept.
      const autosaves = await client
        .from("studio_project_versions")
        .select("id")
        .eq("project_id", input.projectId)
        .eq("owner_id", ownerId)
        .eq("kind", "autosave")
        .order("created_at", { ascending: false })
        .range(MAX_VERSIONS_KEPT, MAX_VERSIONS_KEPT + 200);
      const stale = ((autosaves.data ?? []) as Array<{ id: string }>).map((r) => r.id);
      if (stale.length) await client.from("studio_project_versions").delete().in("id", stale).eq("owner_id", ownerId);
      return version;
    },
  };
}
