import FreshMailPanel from "./FreshMailPanel";
import { useLayout } from "../../app/contexts/useLayout";
import "./WorkspacePage.css";

/** Fresh Mail is a distinct workspace, not a tab inside Messages. */
export default function FreshMailWorkspace() {
  const { setActiveRoute } = useLayout();
  return (
    <section className="workspace-page fresh-mail-independent-workspace" aria-labelledby="fresh-mail-workspace-title">
      <header className="workspace-header">
        <button type="button" className="workspace-back-button" onClick={() => setActiveRoute("fresh-flow")} aria-label="Back to previous Fresh Flow experience">
          ↩ <span>Back to Fresh Flow</span>
        </button>
        <h1 id="fresh-mail-workspace-title">Fresh Mail</h1>
        <p>Your email workspace, separate from real-time chats and conversations.</p>
      </header>
      <FreshMailPanel />
    </section>
  );
}
