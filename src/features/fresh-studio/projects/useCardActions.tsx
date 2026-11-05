import { useCallback, useState, type ReactNode } from "react";
import type { StudioProject } from "../shared/types.ts";
import type { CardAction } from "../components/ProjectCard.tsx";
import ConfirmDialog from "../components/ConfirmDialog.tsx";
import TextPromptDialog from "../components/TextPromptDialog.tsx";
import type { ProjectActions, Notify } from "./useProjectActions.ts";

type Pending =
  | { kind: "rename"; project: StudioProject }
  | { kind: "folder"; project: StudioProject }
  | { kind: "trash"; project: StudioProject }
  | { kind: "delete"; project: StudioProject }
  | null;

/**
 * Turns project-card menu choices into real operations plus the dialogs they need.
 * Share and Export are honest about not being available yet (spec §26.7).
 */
export function useCardActions(actions: ProjectActions, notify: Notify, onOpen: (project: StudioProject) => void): { handle: (action: CardAction, project: StudioProject) => void; dialogs: ReactNode } {
  const [pending, setPending] = useState<Pending>(null);
  const close = useCallback(() => setPending(null), []);

  const handle = useCallback((action: CardAction, project: StudioProject) => {
    switch (action) {
      case "open": onOpen(project); break;
      case "rename": setPending({ kind: "rename", project }); break;
      case "folder": setPending({ kind: "folder", project }); break;
      case "trash": setPending({ kind: "trash", project }); break;
      case "delete": setPending({ kind: "delete", project }); break;
      case "duplicate": void actions.duplicate(project); break;
      case "archive": void actions.archive(project); break;
      case "restore": void actions.restore(project); break;
      case "share": notify("info", "Sharing needs Team workspaces, which are not available yet. Nothing was shared."); break;
      case "export": notify("info", "Exporting needs the Studio render pipeline, which is not connected yet."); break;
    }
  }, [actions, notify, onOpen]);

  let dialogs: ReactNode = null;
  if (pending?.kind === "rename") {
    const p = pending.project;
    dialogs = <TextPromptDialog title="Rename project" label="Project name" initial={p.name} confirmLabel="Rename" onCancel={close} onSubmit={(v) => { close(); void actions.rename(p, v); }} />;
  } else if (pending?.kind === "folder") {
    const p = pending.project;
    dialogs = <TextPromptDialog title="Move to folder" label="Folder name (leave empty to remove from folder)" initial={p.meta.folder ?? ""} confirmLabel="Move" maxLength={80} allowEmpty onCancel={close} onSubmit={(v) => { close(); void actions.moveToFolder(p, v.trim() || null); }} />;
  } else if (pending?.kind === "trash") {
    const p = pending.project;
    dialogs = <ConfirmDialog title="Move to trash?" body={`“${p.name}” will move to the trash. You can restore it from Projects → Trash.`} confirmLabel="Move to trash" destructive onCancel={close} onConfirm={() => { close(); void actions.moveToTrash(p); }} />;
  } else if (pending?.kind === "delete") {
    const p = pending.project;
    dialogs = <ConfirmDialog title="Delete forever?" body={`“${p.name}” and its version history will be permanently deleted. This cannot be undone.`} confirmLabel="Delete forever" destructive onCancel={close} onConfirm={() => { close(); void actions.deleteForever(p); }} />;
  }

  return { handle, dialogs };
}
