import { useLayout } from "../contexts/useLayout";
import "./FreshFlowMediaNav.css";

type MediaDirectorate = { id: string; label: string };

export const FRESH_FLOW_MEDIA_DIRECTORATES: MediaDirectorate[] = [
  { id: "fresh-flow", label: "Home" },
  { id: "long-videos", label: "Long Videos" },
  { id: "news-posts", label: "News / Posts" },
  { id: "vr-ar", label: "AR / VR" },
  { id: "podcasts", label: "Podcasts" },
  { id: "others", label: "Others" },
];

export function isFreshFlowMediaRoute(route?: string) {
  return FRESH_FLOW_MEDIA_DIRECTORATES.some((item) => item.id === route);
}

export default function FreshFlowMediaNav() {
  const { activeRoute, setActiveRoute } = useLayout();

  return (
    <nav className="fresh-flow-media-nav" aria-label="Fresh Flow media directorates">
      <div className="fresh-flow-media-nav-scroll">
        {FRESH_FLOW_MEDIA_DIRECTORATES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`fresh-flow-media-tab${activeRoute === item.id ? " active" : ""}`}
            aria-current={activeRoute === item.id ? "page" : undefined}
            onClick={() => setActiveRoute(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
