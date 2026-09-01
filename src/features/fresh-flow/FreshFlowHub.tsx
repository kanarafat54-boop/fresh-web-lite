import { useState } from "react";
import FreshFlowShortsStream from "./components/FreshFlowShortsStream";
import EcosystemPlaceholder from "../workspaces/EcosystemPlaceholder";
import "./components/FreshFlow.css";

type FreshFlowTab = "home" | "long-videos" | "news-posts" | "ar-vr" | "podcasts";

const TABS: Array<{ id: FreshFlowTab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "long-videos", label: "Long Videos" },
  { id: "news-posts", label: "News/Posts" },
  { id: "ar-vr", label: "AR/VR" },
  { id: "podcasts", label: "Podcasts" },
];

const PLACEHOLDER_COPY: Record<Exclude<FreshFlowTab, "home">, { name: string; description: string }> = {
  "long-videos": { name: "Fresh Flow · Long Videos", description: "Long-form video watching and playback." },
  "news-posts": { name: "Fresh Flow · News/Posts", description: "News and text/photo posts surfaced alongside video." },
  "ar-vr": { name: "Fresh Flow · AR/VR", description: "Immersive AR/VR content within Fresh Flow." },
  podcasts: { name: "Fresh Flow · Podcasts", description: "Audio podcast listening within Fresh Flow." },
};

/**
 * Fresh Flow: a parallel discovery surface alongside the dedicated Shorts
 * tab. Only "Home" (the vertical Shorts stream) is real right now — it
 * reuses the same canonical Shorts data/interactions as the Shorts tab, but
 * with its own discovery-first ranking algorithm. The other four tabs are
 * honest placeholders: scoped, routable, but not yet built.
 */
export default function FreshFlowHub() {
  const [tab, setTab] = useState<FreshFlowTab>("home");

  return (
    <div className="fresh-flow-hub">
      <nav className="fresh-flow-tabs" aria-label="Fresh Flow sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "fresh-flow-tab active" : "fresh-flow-tab"}
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "home" ? (
        <FreshFlowShortsStream />
      ) : (
        <EcosystemPlaceholder {...PLACEHOLDER_COPY[tab]} />
      )}
    </div>
  );
}
