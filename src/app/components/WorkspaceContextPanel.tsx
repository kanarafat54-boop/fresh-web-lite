import { useLayout } from "../contexts/useLayout";
import "./WorkspaceContextPanel.css";

const labels: Record<string, string> = {
  feed: "Home",
  "fresh-flow": "Fresh AI",
  work: "Fresh Work",
  saved: "History",
  creator: "Templates",
  "api-hub": "Integrations",
  connect: "Connect",
  learn: "Academy",
  marketplace: "Marketplace",
};

export default function WorkspaceContextPanel() {
  const { activeRoute } = useLayout();
  const title = labels[activeRoute ?? ""] ?? "Workspace";

  return (
    <aside className="fresh-context-panel" aria-label="Workspace context">
      <div className="fresh-context-head">
        <div>
          <span>Context</span>
          <h2>{title}</h2>
        </div>
        <button type="button" aria-label="More context options">
          •••
        </button>
      </div>

      <div className="fresh-context-card">
        <span className="fresh-context-icon">✦</span>
        <div>
          <strong>Fresh intelligence</strong>
          <p>Context, tools and workspace state stay close to the active surface.</p>
        </div>
      </div>

      <div className="fresh-context-section">
        <span>Active surface</span>
        <strong>{title}</strong>
        <small>Synced with your workspace</small>
      </div>

      <div className="fresh-context-section">
        <span>Available context</span>
        <div className="fresh-context-chips">
          <b>Conversation</b>
          <b>Files</b>
          <b>Tools</b>
          <b>Sources</b>
        </div>
      </div>

      <div className="fresh-context-section">
        <span>Workspace status</span>
        <div className="fresh-context-status">
          <i /> All systems operational
        </div>
      </div>
    </aside>
  );
}
