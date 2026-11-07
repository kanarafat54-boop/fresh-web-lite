import type { ReactNode } from "react";
import ProjectCard from "../components/ProjectCard.tsx";
import { isActive } from "../projects/projectService.ts";
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

const Empty = ({ text }: { text: string }) => <p className="fs-empty">{text}</p>;

export default function StudioHome(props: StudioScreenProps) {
  const { state, goto, openProject, onCardAction, navigateRoute, openDeviceEditor } = props;
  const active = state.projects.filter(isActive);
  const latest = active[0] ?? null;
  const recent = active.slice(0, 6);
  const drafts = active.filter((p) => p.meta.status === "planning" || p.meta.status === "editing").slice(0, 6);
  const rendering = active.filter((p) => p.meta.status === "rendering" || p.meta.status === "failed");

  return (
    <div className="fs-home">
      <header className="fs-welcome">
        <h1>Your creativity, without boundaries.</h1>
        <p>Create videos, images, music, animations and experiences in one workspace.</p>
        <div className="fs-actions" role="group" aria-label="Start creating">
          <button type="button" className="fs-btn fs-btn-primary" onClick={() => goto("create")}>＋ Create a project</button>
          <button type="button" className="fs-btn" disabled={!latest} onClick={() => latest && openProject(latest)} title={latest ? `Open ${latest.name}` : "No projects yet"}>Continue editing</button>
          <button type="button" className="fs-btn" onClick={() => navigateRoute("ai")}>✦ Generate with Fresh AI</button>
          <button type="button" className="fs-btn" onClick={openDeviceEditor}>Import media</button>
          <button type="button" className="fs-btn" disabled title="Live production is not available yet">Start live production</button>
        </div>
      </header>

      {state.loading && <p className="fs-muted" role="status">Loading your projects…</p>}
      {state.error && (
        <div className="fs-banner is-error" role="alert">
          <span>{state.error}</span>
          <button type="button" className="fs-btn" onClick={() => void state.reload()}>Try again</button>
        </div>
      )}

      {!state.loading && !state.error && active.length === 0 && (
        <div className="fs-empty-hero">
          <h2>Start your first project</h2>
          <p>Pick what you want to make. You can change compatible settings later without losing work.</p>
          <button type="button" className="fs-btn fs-btn-primary" onClick={() => goto("create")}>Create a project</button>
        </div>
      )}

      {latest && (
        <Section title="Continue working" hint="Pick up where you left off.">
          <div className="fs-grid fs-grid-one"><ProjectCard project={latest} onAction={onCardAction} /></div>
        </Section>
      )}

      {recent.length > 0 && (
        <Section title="Recent projects" action={<button type="button" className="fs-link" onClick={() => goto("projects")}>See all</button>}>
          <div className="fs-grid">{recent.map((p) => <ProjectCard key={p.id} project={p} onAction={onCardAction} />)}</div>
        </Section>
      )}

      <Section title="Your drafts">
        {drafts.length ? <div className="fs-grid">{drafts.map((p) => <ProjectCard key={p.id} project={p} onAction={onCardAction} />)}</div> : <Empty text="Projects in planning or editing appear here." />}
      </Section>

      <div className="fs-two-col">
        <Section title="Templates"><Empty text="No templates yet. Templates arrive with the design workspace." /></Section>
        <Section title="AI-generated creations"><Empty text="Nothing generated inside Studio yet. Open Fresh AI to create." /></Section>
        <Section title="Shared projects"><Empty text="Shared projects need Team workspaces, which are not available yet." /></Section>
        <Section title="Scheduled publications"><Empty text="Nothing is scheduled. Publishing is not connected yet." /></Section>
        <Section title="Recent exports"><Empty text="No exports from Studio projects yet." /></Section>
        <Section title="Render activity">
          {rendering.length
            ? <ul className="fs-list">{rendering.map((p) => <li key={p.id}><button type="button" className="fs-link" onClick={() => openProject(p)}>{p.name}</button> — {p.meta.status === "failed" ? "failed" : "rendering"}</li>)}</ul>
            : <Empty text="No render jobs yet." />}
        </Section>
      </div>
    </div>
  );
}
