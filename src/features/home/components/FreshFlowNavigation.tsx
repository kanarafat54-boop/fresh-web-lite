import { useMemo, useState } from "react";
import { useLayout } from "../../../app/contexts/useLayout";
import { FeatureRegistry } from "../../../app/registry/FeatureRegistry";
import FreshFlowShortsStream from "../../fresh-flow/components/FreshFlowShortsStream";

type FlowItem = {
  id: string;
  label: string;
  icon: string;
  route?: string;
  description: string;
};

// Locked to the supplied Fresh Flow reference: six media destinations.
const FLOW_ITEMS: FlowItem[] = [
  { id: "home", label: "Home", icon: "⌂", route: "feed", description: "Your complete Fresh starting point" },
  { id: "long-video", label: "Long Videos", icon: "▶", description: "Deep videos, documentaries and series" },
  { id: "news-posts", label: "News / Posts", icon: "▤", route: "feed", description: "News, posts, photos and discussions" },
  { id: "vr-ar", label: "AR / VR", icon: "◈", route: "vr-ar", description: "Immersive worlds and spatial experiences" },
  { id: "podcasts", label: "Podcasts", icon: "◉", description: "Podcasts, shows and conversations" },
  { id: "others", label: "Others", icon: "▦", description: "Additional Fresh Flow media and connected experiences" },
];

export default function FreshFlowNavigation() {
  const { setActiveRoute } = useLayout();
  const [active, setActive] = useState("home");
  const [notice, setNotice] = useState<string | null>(null);

  const available = useMemo(() => new Set(FeatureRegistry.getAll().map((feature) => feature.id)), []);

  function select(item: FlowItem) {
    setActive(item.id);
    setNotice(null);

    if (item.route && available.has(item.route)) {
      setActiveRoute(item.route);
      return;
    }

    setNotice(`${item.label} is part of the Fresh Flow media space and is ready for its connected workspace.`);
  }

  return (
    <section className="fresh-flow" aria-label="Fresh content flow">
      <header className="fresh-flow-header">
        <div>
          <span className="fresh-flow-kicker">FRESH FLOW</span>
          <h1>Explore your way</h1>
          <p>Choose a media world above. Short videos continue below in Fresh Flow — swipe left or right to move between videos.</p>
        </div>
      </header>

      <nav className="fresh-flow-tabs" aria-label="Fresh Flow media destinations">
        {FLOW_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`fresh-flow-tab ${active === item.id ? "active" : ""}`}
            onClick={() => select(item)}
            aria-pressed={active === item.id}
            title={item.description}
          >
            <span className="fresh-flow-tab-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {notice && <div className="fresh-flow-notice" role="status">{notice}</div>}

      <div className="fresh-flow-divider">
        <span>SHORT FLOW</span>
        <i aria-hidden="true" />
        <small>Fresh's own discovery algorithm</small>
      </div>

      <div className="fresh-short-flow-shell">
        <FreshFlowShortsStream />
      </div>
    </section>
  );
}
