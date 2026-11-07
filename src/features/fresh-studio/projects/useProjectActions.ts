import { useCallback } from "react";
import type { StudioProject } from "../shared/types.ts";
import { StudioConflictError, StudioValidationError } from "./projectService.ts";
import type { StudioProjectsState } from "./useStudioProjects.ts";

export type Notify = (kind: "info" | "error", text: string) => void;

export function describeError(error: unknown): string {
  if (error instanceof StudioConflictError) return error.message;
  if (error instanceof StudioValidationError) return error.errors.join(" ");
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

/** Project lifecycle actions shared by the dashboard, project list and details screens. */
export function useProjectActions(state: StudioProjectsState, notify: Notify) {
  const { service, applyUpdate, remove, reload } = state;

  const run = useCallback(
    async (work: (s: NonNullable<typeof service>) => Promise<StudioProject | void>, done?: string) => {
      if (!service) return null;
      try {
        const result = await work(service);
        if (result) applyUpdate(result);
        if (done) notify("info", done);
        return result ?? null;
      } catch (error) {
        notify("error", describeError(error));
        if (error instanceof StudioConflictError) await reload();
        return null;
      }
    },
    [service, applyUpdate, notify, reload],
  );

  return {
    rename: (p: StudioProject, name: string) => run((s) => s.rename(p, name), "Project renamed."),
    duplicate: (p: StudioProject) => run((s) => s.duplicate(p), "Project duplicated."),
    archive: (p: StudioProject) => run((s) => s.archive(p), "Project archived."),
    moveToTrash: (p: StudioProject) => run((s) => s.moveToTrash(p), "Moved to trash. You can restore it for 30 days."),
    restore: (p: StudioProject) => run((s) => s.restore(p), "Project restored."),
    moveToFolder: (p: StudioProject, folder: string | null) => run((s) => s.moveToFolder(p, folder), folder ? `Moved to “${folder}”.` : "Removed from folder."),
    deleteForever: async (p: StudioProject) => {
      const ok = await run(async (s) => { await s.deleteForever(p); }, "Project deleted permanently.");
      if (ok === null && service) {
        // run() returns null both for void success and failure; confirm by checking the store.
        const still = await service.get(p.id).catch(() => p);
        if (!still) remove(p.id);
      }
    },
  };
}

export type ProjectActions = ReturnType<typeof useProjectActions>;
