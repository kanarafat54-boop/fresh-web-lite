import { useState } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import FreshFlowShortsStream from "./components/FreshFlowShortsStream";
import FreshFlowNewsPosts from "./components/FreshFlowNewsPosts";
import FreshFlowMediaWorkspace from "./components/FreshFlowMediaWorkspace";
import FreshFlowSearchSurface from "./components/FreshFlowSearchSurface";
import "./components/FreshFlow.css";
import "./components/FreshFlowReferenceShell.css";

type FreshFlowSection =
  | "fresh-flow"
  | "fresh-flow-long-videos"
  | "fresh-flow-news-posts"
  | "fresh-flow-ar-vr"
  | "fresh-flow-podcasts"
  | "fresh-flow-more";

const MEDIA_NAV = [
  { id: "fresh-flow", label: "Home", icon: "⌂" },
  { id: "fresh-flow-long-videos", label: "Long Videos", icon: "▷" },
  { id: "fresh-flow-news-posts", label: "News / Posts", icon: "▤" },
  { id: "fresh-flow-ar-vr", label: "AR / VR", icon: "◇" },
  { id: "fresh-flow-podcasts", label: "Podcasts", icon: "♩" },
  { id: "fresh-flow-more", label: "Others", icon: "▦" },
] as const;

const SECTION_COPY = {
  "fresh-flow-long-videos": { name: "Long Videos", description: "Long-form video watching, documentaries and series within Fresh Flow.", icon: "▷", kind: "long-videos" as const },
  "fresh-flow-ar-vr": { name: "AR / VR", description: "Immersive AR and VR experiences connected to Fresh Flow.", icon: "◇", kind: "ar-vr" as const },
  "fresh-flow-podcasts": { name: "Podcasts", description: "Podcast shows, conversations and listening experiences within Fresh Flow.", icon: "♩", kind: "podcasts" as const },
  "fresh-flow-more": { name: "Others", description: "Additional Fresh Flow media and connected experiences.", icon: "▦", kind: "others" as const },
};

export default function FreshFlowHub() {
  const { activeRoute, setActiveRoute } = useLayout();
  const section = (activeRoute || "fresh-flow") as FreshFlowSection;
  const isOverview = section === "fresh-flow";
  const [immersive, setImmersive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navAtBottom = !isOverview || immersive;

  const mediaNavigation = (
    <nav
      className={`fresh-flow-media-nav ${navAtBottom ? "fresh-flow-media-nav-bottom" : "fresh-flow-media-nav-top"}`}
      aria-label="Fresh Flow media navigation"
    >
      {MEDIA_NAV.map((item) => (
        <button key={item.id} type="button" className={`fresh-flow-media-button ${section === item.id ? "active" : ""}`} onClick={() => setActiveRoute(item.id)} aria-current={section === item.id ? "page" : undefined}>
          <span className="fresh-flow-media-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className={`fresh-flow-hub ${isOverview ? "fresh-flow-overview" : "fresh-flow-media-experience"}`} aria-label="Fresh Flow">
      {isOverview ? (
        <div className="fresh-flow-reference-header">
          <button type="button" className="fresh-flow-search" onClick={() => setSearchOpen(true)} aria-label="Search anything on Fresh">
            <span className="fresh-flow-search-icon">⌕</span>
            <span>Search anything on Fresh...</span>
          </button>
          {!navAtBottom && mediaNavigation}
        </div>
      ) : (
        <header className="fresh-flow-experience-header">
          <button type="button" className="fresh-flow-back" onClick={() => setActiveRoute("fresh-flow")} aria-label="Back to Fresh Flow">←</button>
          <div><span className="fresh-flow-experience-kicker">Fresh Flow</span><h1>{MEDIA_NAV.find((item) => item.id === section)?.label}</h1></div>
          <button type="button" className="fresh-flow-experience-search" onClick={() => setSearchOpen(true)} aria-label="Search Fresh">⌕</button>
        </header>
      )}
      <main className="fresh-flow-media-content">
        {section === "fresh-flow" ? (
          <FreshFlowShortsStream onImmersiveChange={setImmersive} />
        ) : section === "fresh-flow-news-posts" ? (
          <FreshFlowNewsPosts />
        ) : (
          <FreshFlowMediaWorkspace {...SECTION_COPY[section]} title={SECTION_COPY[section].name} />
        )}
      </main>
      {navAtBottom && mediaNavigation}
      {searchOpen && <FreshFlowSearchSurface onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
