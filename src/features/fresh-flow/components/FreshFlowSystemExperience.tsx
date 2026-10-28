import type { FreshFlowIndependentSystem } from "../core/freshFlowSystemRegistry";
import "./FreshFlowSystemExperience.css";

type Props = {
  system: FreshFlowIndependentSystem;
  onBack: () => void;
  onOpenStudio: () => void;
};

const ICONS: Record<string, string> = {
  "short-video": "▶", "long-video": "▻", "film-catalog": "▣", "series-catalog": "▤",
  "live-video": "◉", "sports-discovery": "⚑", "text-posts": "✎", groups: "◎",
  "temporary-media": "◷", "creator-pages": "◉", "music-catalog": "♫", "podcast-shows": "🎙",
  "radio-stations": "◖", "spoken-books": "▥", "news-publishers": "▤", ebooks: "▤",
  courses: "✦", "research-search": "⌕", images: "▧", vr: "◇",
  "branching-narratives": "⑂", "game-discovery": "◈", "media-library": "✧",
  "broadcast-setup": "◉", "event-listings": "▦",
};

export default function FreshFlowSystemExperience({ system, onBack, onOpenStudio }: Props) {
  const primaryActions = system.capabilities.slice(0, 3);
  const secondaryActions = system.capabilities.slice(3);
  return (
    <div className={`fresh-flow-system-page system-${system.id}`}>
      <header className="fresh-flow-system-header">
        <button type="button" onClick={onBack} className="fresh-flow-system-back" aria-label="Back to Fresh Flow Home">‹ <span>Fresh Flow</span></button>
        <span className="fresh-flow-system-status">Experience scaffold · planned</span>
      </header>
      <section className="fresh-flow-system-hero">
        <div className="fresh-flow-system-symbol" aria-hidden="true">{ICONS[primaryActions[0]] ?? "✦"}</div>
        <p className="fresh-flow-system-kicker">INDEPENDENT FRESH FLOW EXPERIENCE</p>
        <h1>{system.label}</h1>
        <p>{system.description}</p>
        <div className="fresh-flow-system-hero-actions">
          <button type="button" className="primary" onClick={onOpenStudio}>Create or contribute <span aria-hidden="true">↗</span></button>
          <button type="button" className="secondary" onClick={onBack}>Explore Fresh Flow</button>
        </div>
      </section>
      <section className="fresh-flow-system-content" aria-labelledby="fresh-flow-system-tools">
        <div className="fresh-flow-system-section-heading"><div><span>YOUR WORKSPACE</span><h2 id="fresh-flow-system-tools">Explore {system.label}</h2></div><span className="fresh-flow-system-count">{system.capabilities.length} planned capabilities</span></div>
        <p className="fresh-flow-system-note">This is a dedicated starting layout for {system.label}. Real content, provider connections and actions are not represented as live until implemented and tested.</p>
        <div className="fresh-flow-system-capability-grid">
          {primaryActions.map((capability) => (
            <article className="fresh-flow-system-capability featured" key={capability}>
              <span className="fresh-flow-system-capability-icon" aria-hidden="true">{ICONS[capability] ?? "✦"}</span>
              <h3>{capability.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</h3>
              <p>A dedicated area for this {system.label} workflow, with its own navigation and state.</p>
              <span className="fresh-flow-system-planned">Planned</span>
            </article>
          ))}
          {secondaryActions.map((capability) => (
            <article className="fresh-flow-system-capability" key={capability}>
              <span className="fresh-flow-system-capability-icon" aria-hidden="true">{ICONS[capability] ?? "✦"}</span>
              <h3>{capability.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</h3>
              <p>System-specific capability. Requires its own contract, data flow and verification.</p>
              <span className="fresh-flow-system-planned">Planned</span>
            </article>
          ))}
        </div>
      </section>
      <footer className="fresh-flow-system-footer"><span>This system shares Fresh Flow platform services without sharing a generic product screen.</span><button type="button" onClick={onBack}>Back to Home</button></footer>
    </div>
  );
}
