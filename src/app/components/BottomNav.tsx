import {
  HomeIcon,
  FeedIcon,
  PlusIcon,
  ProfileIcon,
  AIIcon,
} from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import "./BottomNav.css";

type BottomDestination = {
  id: string;
  label: string;
  icon: typeof HomeIcon;
};

const destinations: BottomDestination[] = [
  { id: "feed", label: "Home", icon: HomeIcon },
  { id: "communication", label: "Connect", icon: FeedIcon },
  { id: "studio", label: "Create", icon: PlusIcon },
  { id: "learning", label: "Discover", icon: AIIcon },
  { id: "profile", label: "Me", icon: ProfileIcon },
];

export default function BottomNav() {
  const { activeRoute, setActiveRoute } = useLayout();

  return (
    <nav className="fresh-bottom-nav" aria-label="Primary navigation">
      {destinations.map(({ id, label, icon: Icon }) => {
        const active = activeRoute === id;
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
              <Icon size={id === "studio" ? 26 : 24} />
            </span>
            <span className="fresh-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
