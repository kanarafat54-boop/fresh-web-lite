import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./fresh-studio.css";
import { MOBILE_PRIMARY_SECTIONS, STUDIO_SECTIONS, type StudioSectionId } from "./shared/studioNav.ts";
import type { StudioProject } from "./shared/types.ts";
import type { StudioScreenProps } from "./shared/context.ts";
import { useStudioProjects } from "./projects/useStudioProjects.ts";
import { useProjectActions, type Notify } from "./projects/useProjectActions.ts";
import { useCardActions } from "./projects/useCardActions.tsx";
import StudioHome from "./dashboard/StudioHome.tsx";
import ProjectsView from "./projects/ProjectsView.tsx";
import CreateProject from "./projects/CreateProject.tsx";
import ProjectDetails from "./projects/ProjectDetails.tsx";
import StudioSettings from "./settings/StudioSettings.tsx";
import InfoSection from "./shared/InfoSection.tsx";

type Props = {
  onBack: () => void;
  /** Navigate to another Fresh Web Lite route id such as "ai", "creator" or "fresh-flow". */
  onNavigateRoute: (route: string) => void;
  /** Open the existing on-device editor (video/photo import, trim, export). */
  onOpenDeviceEditor: () => void;
};

type Notice = { id: number; kind: "info" | "error"; text: string };
type View = { section: StudioSectionId; projectId: string | null };

export default function FreshStudioApp({ onBack, onNavigateRoute, onOpenDeviceEditor }: Props) {
  const state = useStudioProjects();
  const [view, setView] = useState<View>({ section: "home", projectId: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [history, setHistory] = useState<Notice[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const nextId = useRef(1);

  const notify: Notify = useCallback((kind, text) => {
    const notice: Notice = { id: nextId.current++, kind, text };
    setNotices((n) => [...n.slice(-2), notice]);
    setHistory((h) => [notice, ...h].slice(0, 8));
    window.setTimeout(() => setNotices((n) => n.filter((x) => x.id !== notice.id)), kind === "error" ? 8000 : 4500);
  }, []);

  const goto = useCallback((section: StudioSectionId) => { setView({ section, projectId: null }); setDrawerOpen(false); }, []);
  const openProject = useCallback((project: StudioProject) => { setView({ section: "projects", projectId: project.id }); setDrawerOpen(false); }, []);

  const actions = useProjectActions(state, notify);
  const { handle: onCardAction, dialogs } = useCardActions(actions, notify, openProject);

  // Move focus to the content when the screen changes so keyboard and screen-reader users land on it.
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }); }, [view.section, view.projectId]);

  const screen: StudioScreenProps = useMemo(() => ({
    state, actions, notify, goto, openProject, onCardAction,
    navigateRoute: onNavigateRoute, openDeviceEditor: onOpenDeviceEditor,
  }), [state, actions, notify, goto, openProject, onCardAction, onNavigateRoute, onOpenDeviceEditor]);

  let content;
  switch (view.section) {
    case "home": content = <StudioHome {...screen} />; break;
    case "projects": content = view.projectId ? <ProjectDetails key={view.projectId} projectId={view.projectId} {...screen} /> : <ProjectsView {...screen} />; break;
    case "create": content = <CreateProject {...screen} />; break;
    case "ai":
      content = <InfoSection title="AI Creation" summary="Generate and transform media with Fresh AI." capabilityIds={["ai-creation"]} actions={[{ label: "Open Fresh AI", onClick: () => onNavigateRoute("ai") }]} />; break;
    case "assets":
      content = <InfoSection title="Assets" summary="Your media library." capabilityIds={["asset-library"]} actions={[{ label: "Import in the device editor", onClick: onOpenDeviceEditor }]} />; break;
    case "templates":
      content = <InfoSection title="Templates" summary="Ready-made starting points." capabilityIds={["design-studio"]} />; break;
    case "brand":
      content = <InfoSection title="Brand Kit" summary="Logos, fonts and brand styles." capabilityIds={["design-studio"]} />; break;
    case "publishing":
      content = <InfoSection title="Publishing" summary="Send finished work to Fresh destinations." capabilityIds={["publishing", "export-presets"]} actions={[{ label: "Open Fresh Flow", onClick: () => onNavigateRoute("fresh-flow") }]} />; break;
    case "analytics":
      content = <InfoSection title="Analytics" summary="Performance from real recorded events only." capabilityIds={["analytics"]} actions={[{ label: "Open Creator dashboard", onClick: () => onNavigateRoute("creator") }]} />; break;
    case "team":
      content = <InfoSection title="Team" summary="Collaboration, reviews and approvals." capabilityIds={["collaboration"]} />; break;
    case "settings": content = <StudioSettings />; break;
  }

  const navItem = (id: StudioSectionId, label: string, icon: string) => (
    <button key={id} type="button" className={`fs-nav-item${view.section === id ? " is-active" : ""}`} aria-current={view.section === id ? "page" : undefined} onClick={() => goto(id)}>
      <span aria-hidden="true">{icon}</span><span>{label}</span>
    </button>
  );

  return (
    <div className="fs-app" data-source={state.source}>
      <header className="fs-topbar">
        <button type="button" className="fs-icon-btn fs-only-mobile" aria-label="Open Studio menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen((v) => !v)}>☰</button>
        <button type="button" className="fs-wordmark" onClick={() => goto("home")} aria-label="Fresh Studio home">Fresh <b>Studio</b></button>
        <div className="fs-topbar-spacer" />
        <button type="button" className="fs-icon-btn" aria-label="Search projects" onClick={() => goto("projects")}>⌕</button>
        <div className="fs-menu-wrap">
          <button type="button" className="fs-icon-btn" aria-label="Notifications" aria-expanded={bellOpen} onClick={() => { setBellOpen((v) => !v); setHelpOpen(false); }}>🔔{history.some((h) => h.kind === "error") && <span className="fs-dot" aria-hidden="true" />}</button>
          {bellOpen && (
            <div className="fs-popover" role="region" aria-label="Recent notifications">
              {history.length === 0 ? <p className="fs-muted">No notifications yet.</p> : <ul>{history.map((h) => <li key={h.id} className={h.kind === "error" ? "is-error" : ""}>{h.text}</li>)}</ul>}
            </div>
          )}
        </div>
        <div className="fs-menu-wrap">
          <button type="button" className="fs-icon-btn" aria-label="Help" aria-expanded={helpOpen} onClick={() => { setHelpOpen((v) => !v); setBellOpen(false); }}>?</button>
          {helpOpen && (
            <div className="fs-popover" role="region" aria-label="Help">
              <p><strong>Getting started</strong></p>
              <p className="fs-muted">Create a project, set its options, then open it. Projects autosave and keep a version history you can restore from. The “What works today” list in Settings shows which tools are real.</p>
            </div>
          )}
        </div>
        <button type="button" className="fs-icon-btn" aria-label="Your profile" onClick={() => onNavigateRoute("profile")}>☺</button>
        <button type="button" className="fs-btn fs-btn-primary fs-hide-mobile" onClick={() => goto("create")}>＋ Create</button>
        <button type="button" className="fs-btn fs-hide-mobile" onClick={onBack}>Exit Studio</button>
      </header>

      {state.source === "device" && !state.loading && (
        <p className="fs-banner fs-banner-top" role="note">Projects are stored on this device only. {state.fallbackReason ?? ""}</p>
      )}

      <div className="fs-body">
        <nav className={`fs-nav${drawerOpen ? " is-open" : ""}`} aria-label="Studio sections">
          {STUDIO_SECTIONS.map((s) => navItem(s.id, s.label, s.icon))}
          <button type="button" className="fs-nav-item fs-only-mobile" onClick={onBack}><span aria-hidden="true">←</span><span>Exit Studio</span></button>
        </nav>
        {drawerOpen && <div className="fs-scrim" aria-hidden="true" onClick={() => setDrawerOpen(false)} />}

        <main className="fs-main" ref={mainRef} tabIndex={-1}>{content}</main>
      </div>

      <nav className="fs-bottombar" aria-label="Studio quick navigation">
        {MOBILE_PRIMARY_SECTIONS.map((id) => {
          const s = STUDIO_SECTIONS.find((x) => x.id === id)!;
          return navItem(s.id, s.label, s.icon);
        })}
        <button type="button" className="fs-nav-item" aria-expanded={drawerOpen} onClick={() => setDrawerOpen((v) => !v)}><span aria-hidden="true">⋯</span><span>More</span></button>
      </nav>

      <div className="fs-toasts" aria-live="polite">
        {notices.map((n) => <div key={n.id} className={`fs-toast${n.kind === "error" ? " is-error" : ""}`} role={n.kind === "error" ? "alert" : "status"}>{n.text}</div>)}
      </div>
      {dialogs}
    </div>
  );
}
