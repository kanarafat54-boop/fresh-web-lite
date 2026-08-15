import { ecosystems } from "../../core/fresh-core/ecosystemRegistry";
import "./WorkspacePage.css";

export default function StudioWorkspace() {
  return (
    <section className="workspace-page" aria-label="Studio workspace">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Create · Produce · Publish</span>
        <h1>Creator Studio</h1>
        <p>
          Your workspace for creation and production across the Fresh ecosystem — from content and
          design to building apps with the Ara6 runtime.
        </p>
      </header>

      <section className="workspace-section">
        <h2>Your ecosystems</h2>
        <div className="workspace-grid">
          {ecosystems
            .filter((e) => e.enabled)
            .map((eco) => (
              <div key={eco.id} className="workspace-card">
                <h3>{eco.name}</h3>
                <p>{eco.description}</p>
                <div className="workspace-meta">
                  <span className="workspace-pill">{eco.category}</span>
                </div>
              </div>
            ))}
        </div>
      </section>
    </section>
  );
}
