import {
  HomeIcon,
  FeedIcon,
  PlusIcon,
  ProfileIcon,
  AIIcon,
} from "../../components/Icons";
import { freshHomeDirections, type FreshHomeDirectionId } from "../../core/platform/freshHomeDirections";
import { useLayout } from "../contexts/useLayout";
import "./BottomNav.css";

type BottomDestination = {
  id: string;
  label: string;
  icon: typeof HomeIcon;
};

const directorateDestinations: BottomDestination[] = [
  { id: "discover", label: "Fresh Feed", icon: FeedIcon },
  { id: "connect", label: "Connect", icon: FeedIcon },
  { id: "create", label: "Create", icon: PlusIcon },
  { id: "learn", label: "Learn", icon: AIIcon },
  { id: "move", label: "Move", icon: AIIcon },
  { id: "think", label: "Think", icon: AIIcon },
];

const iconForEcosystem = (id: string) => {
  if (id === "fresh-flow" || id === "shorts" || id === "live") return FeedIcon;
  if (id === "creator-economy" || id === "api-hub" || id === "ara6") return PlusIcon;
  if (id === "fresh-ai" || id === "academy" || id === "automation") return AIIcon;
  return FeedIcon;
};

export default function BottomNav() {
  const { activeRoute, setActiveRoute } = useLayout();

  const activeDirectorate = freshHomeDirections.find((direction) =>
    direction.ecosystemIds.includes(activeRoute ?? ""),
  );

  const destinations: BottomDestination[] = activeDirectorate
    ? [
        { id: "feed", label: "Home", icon: HomeIcon },
        ...activeDirectorate.ecosystemIds.slice(0, 5).map((id) => ({
          id,
          label: id === "fresh-flow" ? "Fresh Feed" : id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: iconForEcosystem(id),
        })),
      ]
    : [
        { id: "feed", label: "Home", icon: HomeIcon },
        ...directorateDestinations.slice(0, 5),
      ];

  return (
    <nav className="fresh-bottom-nav" aria-label="Fresh Web Lite contextual navigation">
      {destinations.map(({ id, label, icon: Icon }) => {
        const active = activeRoute === id || (id === "feed" && activeRoute === "feed");
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
              <Icon size={id === "create" ? 26 : 24} />
            </span>
            <span className="fresh-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
