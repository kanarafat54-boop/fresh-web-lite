import { useLayout } from "../../app/contexts/useLayout";
import FreshFlowShortsStream from "./components/FreshFlowShortsStream";
import EcosystemPlaceholder from "../workspaces/EcosystemPlaceholder";
import "./components/FreshFlow.css";

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

const SECTION_COPY: Record<Exclude<FreshFlowSection, "fresh-flow">, { name: string; description: string }> = {
  "fresh-flow-long-videos": {
    name: "Fresh Flow · Long Videos",
    description: "Long-form video watching, documentaries and series within Fresh Flow.",
  },
  "fresh-flow-news-posts": {
    name: "Fresh Flow · News / Posts",
    description: "News, posts, photos and discussions connected to the Fresh Flow experience.",
  },
  "fresh-flow-ar-vr": {
    name: "Fresh Flow · AR / VR",
    description: "Immersive AR and VR experiences connected to Fresh Flow.",
  },
  "fresh-flow-podcasts": {
    name: "Fresh Flow · Podcasts",
    description: "Podcast shows, conversations and listening experiences within Fresh Flow.",
  },
  "fresh-flow-more": {
    name: "Fresh Flow · Others",
    description: "Additional Fresh Flow media and connected experiences.",
  },
};

export default function FreshFlowHub() {
  const { activeRoute, setActiveRoute, openSearch } = useLayout();
  const section = (activeRoute || "fresh-flow") as FreshFlowSection;

  return (
    <div className="fresh-flow-hub" aria-label="Fresh Flow">
      <div className="fresh-flow-reference-header">
        <button type="button" className="fresh-flow-search" onClick={openSearch} aria-label="Search anything on Fresh">
          <span className="fresh-flow-search-icon">⌕</span>
          <span>Search anything on Fresh...</span>
        </button>

        <div className="fresh-flow-media-nav" role="navigation" aria-label="Fresh Flow media navigation">
          {MEDIA_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`fresh-flow-media-button ${section === item.id ? "active" : ""}`}
              onClick={() => setActiveRoute(item.id)}
            >
              <span className="fresh-flow-media-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {section === "fresh-flow" ? (
        <FreshFlowShortsStream />
      ) : (
        <EcosystemPlaceholder {...SECTION_COPY[section]} />
      )}
    </div>
  );
}
