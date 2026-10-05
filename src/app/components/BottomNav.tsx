import { HomeIcon, FeedIcon, AIIcon, SearchIcon } from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import "./BottomNav.css";

/** Mockup bottom nav: Home · Flow · AI · Ecosystems · Profile */
type BottomDestination = { id: string; label: string; icon: typeof HomeIcon };
const primaryDestinations: BottomDestination[] = [
  { id: "feed", label: "Home", icon: HomeIcon },
  { id: "fresh-flow", label: "Flow", icon: FeedIcon },
  { id: "ai", label: "AI", icon: AIIcon },
  { id: "discovery", label: "Ecosystems", icon: SearchIcon },
  { id: "profile", label: "Profile", icon: HomeIcon },
];

export default function BottomNav() {
  const { activeRoute, setActiveRoute } = useLayout();
  return (
    <nav className="fresh-bottom-nav" aria-label="Fresh primary navigation">
      <div className="fresh-bottom-nav-scroll">
        {primaryDestinations.map(({ id, label, icon: Icon }) => {
          const active =
            id === "feed"
              ? activeRoute === "feed" || !activeRoute
              : id === "fresh-flow"
                ? typeof activeRoute === "string" && activeRoute.startsWith("fresh-flow")
                : activeRoute === id;
          return (
            <button
              key={id}
              type="button"
              className={`fresh-nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              onClick={() => setActiveRoute(id)}
            >
              <span className="fresh-nav-icon" aria-hidden="true">
                <Icon size={24} />
              </span>
              <span className="fresh-nav-label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
