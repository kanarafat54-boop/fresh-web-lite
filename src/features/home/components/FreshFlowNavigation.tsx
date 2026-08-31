import { useMemo, useState } from "react";
import { useLayout } from "../../../app/contexts/useLayout";
import { FeatureRegistry } from "../../../app/registry/FeatureRegistry";
import { ShortsModule } from "../../shorts/components/ShortsModule";

type FlowItem = {
  id: string;
  label: string;
  icon: string;
  route?: string;
  description: string;
};

const FLOW_ITEMS: FlowItem[] = [
  { id: "home", label: "Home", icon: "⌂", route: "feed", description: "Your complete Fresh starting point" },
  { id: "long-video", label: "Long videos", icon: "▶", description: "Deep videos, documentaries and series" },
  { id: "news-posts", label: "News / Posts", icon: "▤", route: "feed", description: "News, posts, photos and discussions" },
  { id: "vr-ar", label: "AR / VR", icon: "◈", route: "vr-ar", description: "Immersive worlds and spatial experiences" },
  { id: "podcasts", label: "Podcasts", icon: "◉", description: "Podcasts, shows and conversations" },
  { id: "live", label: "Live", icon: "●", route: "live", description: "Live experiences and creators" },
  { id: "learn", label: "Learn", icon: "△", route: "learning", description: "Learning and knowledge" },
  { id: "more", label: "More", icon: "•••", route: "communication", description: "Connect, communities and more" },
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

    if (!item.route) {
      setNotice(`${item.label} is part of the Fresh flow shell and is ready for its dedicated workspace.`);
    }
  }

  return (
    <section className="fresh-flow" aria-label="Fresh content flow">
      <header className="fresh-flow-header">
        <div>
          <span className="fresh-flow-kicker">FRESH FLOW</span>
          <h1>Explore your way</h1>
          <p>Choose a world above. Short videos continue below in a separate Fresh flow — swipe left or right to move between videos.</p>
        </div>
      </header>

      <nav className="fresh-flow-tabs" aria-label="Fresh destinations">
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
        <ShortsModule />
      </div>
    </section>
  );
}
