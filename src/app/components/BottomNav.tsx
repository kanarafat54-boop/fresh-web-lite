import { HomeIcon, FeedIcon, PlusIcon, AIIcon } from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import "./BottomNav.css";

type BottomDestination = { id: string; label: string; icon: typeof HomeIcon };
const primaryDestinations: BottomDestination[] = [
  { id: "feed", label: "Home", icon: HomeIcon },
  { id: "fresh-flow", label: "Flow", icon: FeedIcon },
  { id: "studio", label: "Create", icon: PlusIcon },
  { id: "work", label: "Work", icon: FeedIcon },
  { id: "profile", label: "Profile", icon: AIIcon },
];

export default function BottomNav() {
  const { activeRoute, setActiveRoute, pushNotification } = useLayout();
  return (
    <nav className="fresh-bottom-nav" aria-label="Fresh primary navigation">
      <div className="fresh-bottom-nav-scroll">
        {primaryDestinations.map(({ id, label, icon: Icon }) => {
          const active = id === "feed"
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
              onClick={() => {
                const known = ["feed", "fresh-flow", "studio", "work", "profile"].includes(id);
                if (!known) { pushNotification({ id: `nav-${Date.now()}`, title: "Fresh action unavailable", message: "This destination is not ready yet." }); return; }
                setActiveRoute(id);
              }}
            >
              <span className="fresh-nav-icon" aria-hidden="true"><Icon size={id === "studio" ? 26 : 24} /></span>
              <span className="fresh-nav-label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
