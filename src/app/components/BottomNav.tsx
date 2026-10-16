import { HomeIcon, FeedIcon, AIIcon, PlusIcon, ProfileIcon } from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import "./BottomNav.css";

/** Primary mobile destinations: Home · Flow · Create · AI · Profile */
type BottomDestination = { id: string; label: string; icon: typeof HomeIcon; route: string };
const primaryDestinations: BottomDestination[] = [
  { id: "feed", label: "Home", icon: HomeIcon, route: "feed" },
  { id: "fresh-flow", label: "Flow", icon: FeedIcon, route: "fresh-flow" },
  { id: "studio", label: "Create", icon: PlusIcon, route: "studio" },
  { id: "ai", label: "AI", icon: AIIcon, route: "ai" },
  { id: "profile", label: "Profile", icon: ProfileIcon, route: "profile" },
];

export default function BottomNav() {
  const { activeRoute, setActiveRoute } = useLayout();
  return (
    <nav className="fresh-bottom-nav" aria-label="Fresh primary navigation">
      <div className="fresh-bottom-nav-scroll">
        {primaryDestinations.map(({ id, label, icon: Icon, route }) => {
          const active =
            id === "feed"
              ? activeRoute === "feed" || !activeRoute
              : id === "fresh-flow"
                ? typeof activeRoute === "string" && activeRoute.startsWith("fresh-flow")
                : id === "studio"
                  ? activeRoute === "studio" || activeRoute === "creator"
                  : activeRoute === id;
          return (
            <button
              key={id}
              type="button"
              className={`fresh-nav-item${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              onClick={() => setActiveRoute(route)}
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
