import { useEffect, useRef, useState } from "react";
import { MEDIA_KIND_LABELS, STATUS_LABELS, type StudioProject } from "../shared/types.ts";
import { isArchived, isTrashed } from "../projects/projectService.ts";
import { KIND_GLYPH, formatRelativeTime, projectSizeLabel } from "../shared/format.ts";

export type CardAction = "open" | "rename" | "duplicate" | "folder" | "share" | "export" | "archive" | "trash" | "restore" | "delete";

type Props = {
  project: StudioProject;
  onAction: (action: CardAction, project: StudioProject) => void;
};

function actionsFor(project: StudioProject): Array<{ id: CardAction; label: string; danger?: boolean }> {
  if (isTrashed(project)) return [{ id: "restore", label: "Restore" }, { id: "delete", label: "Delete forever", danger: true }];
  if (isArchived(project)) return [{ id: "open", label: "Open" }, { id: "restore", label: "Restore" }, { id: "trash", label: "Move to trash", danger: true }];
  return [
    { id: "open", label: "Open" },
    { id: "rename", label: "Rename" },
    { id: "duplicate", label: "Duplicate" },
    { id: "folder", label: "Move to folder" },
    { id: "share", label: "Share" },
    { id: "export", label: "Export" },
    { id: "archive", label: "Archive" },
    { id: "trash", label: "Move to trash", danger: true },
  ];
}

export default function ProjectCard({ project, onAction }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trashed = isTrashed(project);
  const size = projectSizeLabel(project);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: Event) => { if (!wrapRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [menuOpen]);

  const pick = (action: CardAction) => { setMenuOpen(false); onAction(action, project); };

  return (
    <article className={`fs-card${trashed ? " is-trashed" : ""}`} data-kind={project.meta.kind}>
      <button type="button" className="fs-card-thumb" onClick={() => pick(trashed ? "restore" : "open")} aria-label={trashed ? `Restore ${project.name}` : `Open ${project.name}`}>
        {project.meta.thumbnailUrl
          ? <img src={project.meta.thumbnailUrl} alt="" loading="lazy" />
          : <span className="fs-card-glyph" aria-hidden="true">{KIND_GLYPH[project.meta.kind]}</span>}
        <span className={`fs-badge fs-status-${project.meta.status}`}>{trashed ? "In trash" : STATUS_LABELS[project.meta.status]}</span>
      </button>
      <div className="fs-card-body">
        <div className="fs-card-title-row">
          <h3 title={project.name}>{project.name}</h3>
          <div className="fs-menu-wrap" ref={wrapRef}>
            <button type="button" className="fs-icon-btn" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`More options for ${project.name}`} onClick={() => setMenuOpen((v) => !v)}>⋯</button>
            {menuOpen && (
              <div className="fs-menu" role="menu">
                {actionsFor(project).map((a) => (
                  <button key={a.id} type="button" role="menuitem" className={a.danger ? "is-danger" : ""} onClick={() => pick(a.id)}>{a.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="fs-card-meta">
          <span>{MEDIA_KIND_LABELS[project.meta.kind]}</span>
          {size && <span className="fs-mono">{size}</span>}
        </p>
        <p className="fs-card-meta fs-muted">
          <span>Owner: You</span>
          <span>{formatRelativeTime(project.updatedAt)}</span>
        </p>
        {project.meta.folder && <p className="fs-card-folder">📁 {project.meta.folder}</p>}
      </div>
    </article>
  );
}
