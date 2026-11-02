import { useCallback, useEffect, useState } from "react";
import { timeAgo } from "../core/shortsActivity";
import {
  PROJECT_CATEGORIES, STATUS_LABELS, PROJECT_STATUSES, createProject, deleteProject, duplicateProject, listProjects, renameProject, setProjectStatus,
  type ProjectCategory, type ProjectStatus, type StudioProject,
} from "../core/studioProjects";

type Props = { userId: string };

/** Studio Projects (spec section 3): real rows in fresh_projects, owner-only, versioned updates. */
export default function StudioProjects({ userId }: Props) {
  const [projects, setProjects] = useState<StudioProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("video");
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try { setProjects(await listProjects(userId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load projects."); setProjects([]); }
  }, [userId]);

  useEffect(() => { void reload(); }, [reload]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await action(); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
    finally { setBusy(false); }
  };

  const visible = (projects ?? []).filter((project) => (project.status === "archived") === showArchived);
  const label = (id: ProjectCategory) => PROJECT_CATEGORIES.find((item) => item.id === id)?.label ?? "Custom";

  return (
    <section className="studio-projects" aria-label="Studio projects">
      <form className="studio-projects-new" onSubmit={(event) => { event.preventDefault(); void run(async () => { await createProject(userId, name, category); setName(""); }); }}>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="New project name" aria-label="New project name" />
        <select value={category} onChange={(event) => setCategory(event.target.value as ProjectCategory)} aria-label="Project type">
          {PROJECT_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <button type="submit" disabled={busy}>Create project</button>
      </form>
      <p className="shorts-studio-note">Projects save to your account with version checks, so two devices never overwrite each other. Editors for each project type are added per workspace; until then a project holds your plan, status and history.</p>
      <div className="studio-projects-filter" role="group" aria-label="Project filter">
        <button type="button" aria-pressed={!showArchived} onClick={() => setShowArchived(false)}>Active</button>
        <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived(true)}>Archived</button>
      </div>
      {error && <p className="shorts-studio-note" role="alert">{error}</p>}
      {!projects && <p className="shorts-studio-note">Loading projects…</p>}
      {projects && visible.length === 0 && <p className="shorts-studio-note">{showArchived ? "No archived projects." : "No projects yet. Create your first one above."}</p>}
      <ul className="studio-projects-list">
        {visible.map((project) => (
          <li key={project.id} className="studio-project-card">
            <div className="studio-project-main">
              {renaming?.id === project.id ? (
                <form onSubmit={(event) => { event.preventDefault(); const value = renaming.value; setRenaming(null); void run(() => renameProject(project, value)); }}>
                  <input autoFocus value={renaming.value} maxLength={80} onChange={(event) => setRenaming({ id: project.id, value: event.target.value })} aria-label="Project name" />
                  <button type="submit">Save</button><button type="button" onClick={() => setRenaming(null)}>Cancel</button>
                </form>
              ) : <strong>{project.name}</strong>}
              <small>{label(project.category)} · updated {timeAgo(project.updatedAt)}</small>
            </div>
            <select value={project.status} disabled={busy} aria-label={`Status of ${project.name}`} onChange={(event) => void run(() => setProjectStatus(project, event.target.value as ProjectStatus))}>
              {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
            </select>
            <div className="studio-project-actions">
              <button type="button" onClick={() => setRenaming({ id: project.id, value: project.name })}>Rename</button>
              <button type="button" disabled={busy} onClick={() => void run(() => duplicateProject(userId, project, (projects ?? []).map((item) => item.name)))}>Duplicate</button>
              <button type="button" disabled={busy} onClick={() => void run(() => setProjectStatus(project, project.status === "archived" ? "draft" : "archived"))}>{project.status === "archived" ? "Restore" : "Archive"}</button>
              {confirmDelete === project.id
                ? <button type="button" className="danger" disabled={busy} onClick={() => { setConfirmDelete(null); void run(() => deleteProject(project)); }}>Confirm delete forever</button>
                : <button type="button" onClick={() => setConfirmDelete(project.id)}>Delete</button>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
