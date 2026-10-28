import { useMemo, useState } from "react";
import {
  FRESH_FLOW_INDEPENDENT_SYSTEMS,
  FRESH_FLOW_SYSTEM_FAMILIES,
  getFreshFlowSystemsByFamily,
} from "../core/freshFlowSystemRegistry";
import "./FreshFlowHome.css";

type Props = {
  onOpenSystem: (systemId: string) => void;
  onOpenRoute: (routeId: string) => void;
  onOpenSearch: () => void;
};

const SHORTCUTS = [
  { id: "fresh-shorts", label: "Shorts", icon: "▶", tone: "violet" },
  { id: "long-video", label: "Videos", icon: "▻", tone: "blue" },
  { id: "fresh-news", label: "News / Posts", icon: "▤", tone: "coral" },
  { id: "vr-ar-spatial", label: "VR / AR", icon: "◇", tone: "mint" },
  { id: "fresh-podcasts", label: "Podcasts", icon: "♫", tone: "amber" },
  { id: "all-systems", label: "Others", icon: "▦", tone: "slate" },
];

export default function FreshFlowHome({ onOpenSystem, onOpenRoute, onOpenSearch }: Props) {
  const [showDirectory, setShowDirectory] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const filteredSystems = useMemo(() => {
    const query = directoryQuery.trim().toLowerCase();
    if (!query) return FRESH_FLOW_INDEPENDENT_SYSTEMS;
    return FRESH_FLOW_INDEPENDENT_SYSTEMS.filter((system) =>
      [system.label, system.description, system.family].some((value) => value.toLowerCase().includes(query)),
    );
  }, [directoryQuery]);

  return (
    <div className="fresh-flow-home-page">
      <section className="fresh-flow-home-hero" aria-labelledby="fresh-flow-home-title">
        <div className="fresh-flow-home-eyebrow"><span aria-hidden="true">✦</span> YOUR MEDIA, YOUR WORLD</div>
        <h1 id="fresh-flow-home-title">Discover. Connect. Create.</h1>
        <p>One place for the things you watch, read, hear, learn and make.</p>
        <button type="button" className="fresh-flow-compose" onClick={() => onOpenSystem("fresh-studio")}>
          <span className="fresh-flow-compose-avatar" aria-hidden="true">+</span>
          <span>What’s happening? Create something...</span>
          <span className="fresh-flow-compose-arrow" aria-hidden="true">↗</span>
        </button>
        <div className="fresh-flow-home-shortcuts" aria-label="Explore Fresh Flow">
          {SHORTCUTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`fresh-flow-home-shortcut tone-${item.tone}`}
              onClick={() => item.id === "all-systems" ? setShowDirectory(true) : onOpenSystem(item.id)}
            >
              <span className="fresh-flow-shortcut-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="fresh-flow-all-systems-link" onClick={() => setShowDirectory((open) => !open)} aria-expanded={showDirectory}>
          {showDirectory ? "Close All Systems" : "Explore all 24 systems"} <span aria-hidden="true">{showDirectory ? "↑" : "→"}</span>
        </button>
      </section>

      {showDirectory ? (
        <section className="fresh-flow-system-directory" aria-labelledby="fresh-flow-directory-title">
          <div className="fresh-flow-section-heading">
            <div><span className="fresh-flow-section-kicker">THE WHOLE ECOSYSTEM</span><h2 id="fresh-flow-directory-title">All systems</h2></div>
            <span className="fresh-flow-system-count">24 experiences</span>
          </div>
          <label className="fresh-flow-directory-search">
            <span aria-hidden="true">⌕</span>
            <input value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} placeholder="Find a system..." aria-label="Find a Fresh Flow system" />
            {directoryQuery && <button type="button" onClick={() => setDirectoryQuery("")} aria-label="Clear system search">×</button>}
          </label>
          {FRESH_FLOW_SYSTEM_FAMILIES.map((family) => {
            const systems = getFreshFlowSystemsByFamily(family.id).filter((system) => filteredSystems.some((match) => match.id === system.id));
            if (!systems.length) return null;
            return (
              <section key={family.id} className="fresh-flow-family-group" aria-labelledby={`family-${family.id}`}>
                <div className="fresh-flow-family-heading"><h3 id={`family-${family.id}`}>{family.label}</h3><span>{systems.length}</span></div>
                <div className="fresh-flow-directory-grid">
                  {systems.map((system) => (
                    <button type="button" className="fresh-flow-directory-card" key={system.id} onClick={() => onOpenSystem(system.id)}>
                      <span className="fresh-flow-directory-card-icon" aria-hidden="true">{system.label.includes("Live") ? "◉" : system.label.includes("Music") || system.label.includes("Audio") || system.label.includes("Podcast") ? "♫" : system.label.includes("VR") || system.label.includes("Interactive") ? "◇" : system.label.includes("News") || system.label.includes("Research") || system.label.includes("Learn") ? "▤" : system.label.includes("Studio") || system.label.includes("Creation") ? "✦" : "▣"}</span>
                      <span className="fresh-flow-directory-card-copy"><strong>{system.label}</strong><small>{system.description}</small></span>
                      <span className="fresh-flow-directory-chevron" aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
          {!filteredSystems.length && <p className="fresh-flow-directory-empty">No systems match that search. Try another name or category.</p>}
        </section>
      ) : (
        <>
          <section className="fresh-flow-feed-section" aria-labelledby="fresh-flow-feed-title">
            <div className="fresh-flow-feed-tabs" aria-label="Fresh Flow discovery">
              <span className="active">For you</span>
              <button type="button" className="fresh-flow-feed-search" onClick={onOpenSearch} aria-label="Search Fresh Flow">⌕</button>
            </div>
            <div className="fresh-flow-section-heading">
              <div><span className="fresh-flow-section-kicker">"A LITTLE OF EVERYTHING"</span><h2 id="fresh-flow-feed-title">"Recommended for you"</h2></div>
              <button type="button" className="fresh-flow-text-action" onClick={() => setShowDirectory(true)}>All systems <span aria-hidden="true">→</span></button>
            </div>
            <p className="fresh-flow-feed-description">"A personalized mix of creators, useful discoveries, and content from across Fresh Flow."</p>
            <div className="fresh-flow-example-notice"><span aria-hidden="true">ⓘ</span><span><strong>Example content — not a live feed.</strong> Real recommendations will appear when the feed and content sources are connected.</span></div>
            <div className="fresh-flow-recommendation-grid">
                <button type="button" className="fresh-flow-recommendation-card feature-card" onClick={() => onOpenSystem("learn")}>
                  <span className="fresh-flow-recommendation-art art-learn" aria-hidden="true"><span>LEARN</span><b>Small steps.<br />Big ideas.</b><i>✦</i></span>
                  <span className="fresh-flow-recommendation-copy"><strong>Learn something new</strong><small>Courses, explainers and practical skills</small></span>
                </button>
                <button type="button" className="fresh-flow-recommendation-card" onClick={() => onOpenSystem("fresh-shorts")}>
                  <span className="fresh-flow-recommendation-art art-shorts" aria-hidden="true"><span>FRESH SHORTS</span><b>Stories in<br />motion.</b><i>▶</i></span>
                  <span className="fresh-flow-recommendation-copy"><strong>Explore short videos</strong><small>Quick ideas from across the community</small></span>
                </button>
                <button type="button" className="fresh-flow-recommendation-card" onClick={() => onOpenSystem("research-knowledge")}>
                  <span className="fresh-flow-recommendation-art art-research" aria-hidden="true"><span>DISCOVER</span><b>Follow the<br />evidence.</b><i>⌕</i></span>
                  <span className="fresh-flow-recommendation-copy"><strong>Research & knowledge</strong><small>Sources, ideas and deeper context</small></span>
                </button>
              </div>
          </section>
          <section className="fresh-flow-home-footer-cta">
            <div><strong>Have an idea worth sharing?</strong><span>Make it yours in Fresh Studio.</span></div>
            <button type="button" onClick={() => onOpenSystem("fresh-studio")}>Create something <span aria-hidden="true">↗</span></button>
          </section>
        </>
      )}

      <nav className="fresh-flow-home-bottom-nav" aria-label="Fresh Flow shortcuts">
        <button type="button" onClick={() => onOpenRoute("feed")} aria-label="Return to Fresh Web Lite home"><span aria-hidden="true">⌂</span><small>Home</small></button>
        <button type="button" onClick={() => onOpenSystem("fresh-shorts")}><span aria-hidden="true">▶</span><small>Shorts</small></button>
        <button type="button" onClick={() => onOpenSystem("fresh-studio")}><span aria-hidden="true">＋</span><small>Create</small></button>
        <button type="button" onClick={() => onOpenRoute("communication")}><span aria-hidden="true">▤</span><small>Messages</small></button>
        <button type="button" onClick={() => onOpenRoute("fresh-mail")}><span aria-hidden="true">✉</span><small>Fresh Mail</small></button>
      </nav>
    </div>
  );
}
