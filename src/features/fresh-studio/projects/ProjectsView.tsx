import { useMemo, useState } from "react";
import ProjectCard from "../components/ProjectCard.tsx";
import { isActive, isArchived, isTrashed } from "./projectService.ts";
import { MEDIA_KIND_LABELS, STUDIO_MEDIA_KINDS, type StudioMediaKind } from "../shared/types.ts";
import type { StudioScreenProps } from "../shared/context.ts";

type Tab = "all" | "archived" | "trash";
type Sort = "recent" | "name";

export default function ProjectsView({ state, goto, onCardAction }: StudioScreenProps) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<StudioMediaKind | "any">("any");
  const [sort, setSort] = useState<Sort>("recent");

  const counts = useMemo(() => ({
    all: state.projects.filter(isActive).length,
    archived: state.projects.filter(isArchived).length,
    trash: state.projects.filter(isTrashed).length,
  }), [state.projects]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = state.projects.filter(tab === "all" ? isActive : tab === "archived" ? isArchived : isTrashed);
    const filtered = pool.filter((p) => (kind === "any" || p.meta.kind === kind) && (!q || p.name.toLowerCase().includes(q) || (p.meta.folder ?? "").toLowerCase().includes(q)));
    return [...filtered].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)));
  }, [state.projects, tab, query, kind, sort]);

  return (
    <div className="fs-projects">
      <header className="fs-section-head">
        <div><h1>Projects</h1><p className="fs-muted">{state.source === "account" ? "Saved to your account." : "Stored on this device only."}</p></div>
        <button type="button" className="fs-btn fs-btn-primary" onClick={() => goto("create")}>＋ New project</button>
      </header>

      <div className="fs-tabs" role="tablist" aria-label="Project lists">
        {([["all", "All"], ["archived", "Archived"], ["trash", "Trash"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>
            {label} <span className="fs-count">{counts[id]}</span>
          </button>
        ))}
      </div>

      <div className="fs-filters">
        <label className="fs-field fs-grow"><span className="fs-sr">Search projects</span>
          <input type="search" placeholder="Search projects and folders" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="fs-field"><span className="fs-sr">Media type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as StudioMediaKind | "any")}>
            <option value="any">All types</option>
            {STUDIO_MEDIA_KINDS.map((k) => <option key={k} value={k}>{MEDIA_KIND_LABELS[k]}</option>)}
          </select>
        </label>
        <label className="fs-field"><span className="fs-sr">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recent">Recently edited</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {tab === "trash" && counts.trash > 0 && <p className="fs-muted">Items in the trash can be restored. Deleting forever cannot be undone.</p>}

      {state.loading ? <p className="fs-muted" role="status">Loading your projects…</p>
        : shown.length === 0 ? (
          <p className="fs-empty">
            {state.projects.length === 0 ? "No projects yet. Create your first one to get started."
              : tab === "trash" ? "The trash is empty."
              : tab === "archived" ? "No archived projects."
              : "No projects match your search."}
          </p>
        ) : <div className="fs-grid">{shown.map((p) => <ProjectCard key={p.id} project={p} onAction={onCardAction} />)}</div>}
    </div>
  );
}
