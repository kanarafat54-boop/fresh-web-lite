import type { ReactNode } from "react";
import ProjectCard from "../components/ProjectCard.tsx";
import { isActive } from "../projects/projectService.ts";
import QuickStart from "../projects/QuickStart.tsx";
import { hasStudioEditor } from "../shared/studioNav.ts";
import type { StudioScreenProps } from "../shared/context.ts";

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="fs-section" aria-label={title}>
      <header className="fs-section-head">
        <div><h2>{title}</h2>{hint && <p className="fs-muted">{hint}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default function StudioHome(props: StudioScreenProps) {
  const { state, goto, openProject, onCardAction, navigateRoute, openDeviceEditor } = props;
  const active = state.projects.filter(isActive);
  const latest = active[0] ?? null;
  const recent = active.slice(0, 6);
  const rendering = active.filter((p) => p.meta.status === "rendering" || p.meta.status === "failed");

  return (
    <div className="fs-home">
      <header className="fs-welcome">
        <h1>What do you want to make?</h1>
        <p>Pick a video shape. Your editor opens right away.</p>
        <QuickStart state={state} notify={props.notify} openProject={openProject} />
        <div className="fs-actions" role="group" aria-label="Other ways to start">
          <button type="button" className="fs-link" onClick={() => navigateRoute("ai")}>✦ Generate with Fresh AI</button>
          <button type="button" className="fs-link" onClick={openDeviceEditor}>Quick edit a file on this device</button>
          <button type="button" className="fs-link" onClick={() => goto("create")}>Other project types</button>
        </div>
      </header>

      {state.loading && <p className="fs-muted" role="status">Loading your projects…</p>}
      {state.error && (
        <div className="fs-banner is-error" role="alert">
          <span>{state.error}</span>
          <button type="button" className="fs-btn" onClick={() => void state.reload()}>Try again</button>
        </div>
      )}

      {latest && (
        <Section title="Continue editing">
          <div className="fs-grid fs-grid-one"><ProjectCard project={latest} onAction={onCardAction} /></div>
        </Section>
      )}

      {recent.length > 1 && (
        <Section title="Recent projects" action={<button type="button" className="fs-link" onClick={() => goto("projects")}>See all</button>}>
          <div className="fs-grid">{recent.slice(1).map((p) => <ProjectCard key={p.id} project={p} onAction={onCardAction} />)}</div>
        </Section>
      )}

      {rendering.length > 0 && (
        <Section title="Needs attention">
          <ul className="fs-list">{rendering.map((p) => <li key={p.id}><button type="button" className="fs-link" onClick={() => openProject(p, { editor: hasStudioEditor(p.meta.kind) })}>{p.name}</button> — {p.meta.status === "failed" ? "failed" : "rendering"}</li>)}</ul>
        </Section>
      )}

      <details className="fs-soon">
        <summary>Not available yet</summary>
        <ul>
          <li>Templates</li><li>AI-generated creations inside Studio</li><li>Shared projects and Team</li><li>Scheduled publishing</li>
        </ul>
      </details>
    </div>
  );
}
