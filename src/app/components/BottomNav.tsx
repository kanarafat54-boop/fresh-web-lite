import {
  HomeIcon,
  FeedIcon,
  PlusIcon,
  AIIcon,
} from "../../components/Icons";
import {
  freshHomeDirections,
  type FreshHomeDirectionId,
} from "../../core/platform/freshHomeDirections";
import { useLayout } from "../contexts/useLayout";
import "./BottomNav.css";

type BottomDestination = {
  id: string;
  label: string;
  icon: typeof HomeIcon;
};

/**
 * Landing navigation is the directorate layer. Home is always the first
 * destination; the remaining slots are the principal directorates and More
 * exposes the rest without turning the landing bar into an ecosystem list.
 */
const landingDestinations: BottomDestination[] = [
  { id: "feed", label: "Home", icon: HomeIcon },
  { id: "create", label: "Create", icon: PlusIcon },
  { id: "discover", label: "Fresh Feed", icon: FeedIcon },
  { id: "connect", label: "Connect", icon: FeedIcon },
  { id: "learn", label: "Learn", icon: AIIcon },
  { id: "more", label: "More", icon: AIIcon },
];

const ecosystemLabel = (id: string) => {
  const labels: Record<string, string> = {
    "fresh-flow": "Fresh Feed",
    shorts: "Shorts",
    live: "Live",
    sports: "Sports",
    search: "Search",
    "vr-ar": "AR / VR",
    language: "Language",
    stories: "Stories",
    groups: "Groups",
    communities: "Communities",
    calls: "Calls",
    "universal-interactions": "Interactions",
    notifications: "Notifications",
    "creator-economy": "Creator Economy",
    "ads-campaigns": "Ads",
    "api-hub": "API Hub",
    ara6: "Ara6",
    academy: "Academy",
    wallet: "Wallet",
    treasure: "Treasure",
    crypto: "Crypto",
    "fresh-ai": "Fresh AI",
    automation: "Automation",
    workspaces: "Workspaces",
    trust: "Trust",
    moderation: "Moderation",
  };

  return labels[id] ?? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const iconForEcosystem = (id: string) => {
  if (["fresh-flow", "shorts", "live", "sports", "search", "vr-ar"].includes(id)) {
    return FeedIcon;
  }
  if (["creator-economy", "ads-campaigns", "api-hub", "ara6", "wallet", "treasure", "crypto"].includes(id)) {
    return PlusIcon;
  }
  if (["fresh-ai", "academy", "automation", "workspaces", "trust", "moderation"].includes(id)) {
    return AIIcon;
  }
  return FeedIcon;
};

function getActiveDirectorate(activeRoute?: string): FreshHomeDirectionId | undefined {
  if (!activeRoute) return undefined;

  if (freshHomeDirections.some((direction) => direction.id === activeRoute)) {
    return activeRoute as FreshHomeDirectionId;
  }

  return freshHomeDirections.find((direction) =>
    direction.ecosystemIds.includes(activeRoute),
  )?.id;
}

export default function BottomNav() {
  const { activeRoute, setActiveRoute } = useLayout();
  const activeDirectorate = getActiveDirectorate(activeRoute);

  const destinations: BottomDestination[] = activeDirectorate
    ? [
        { id: "feed", label: "Home", icon: HomeIcon },
        ...freshHomeDirections
          .find((direction) => direction.id === activeDirectorate)!
          .ecosystemIds.map((id) => ({
            id,
            label: ecosystemLabel(id),
            icon: iconForEcosystem(id),
          })),
      ]
    : landingDestinations;

  return (
    <nav
      className="fresh-bottom-nav"
      aria-label={activeDirectorate ? `${activeDirectorate} ecosystem navigation` : "Fresh Web Lite directorate navigation"}
    >
      <div className="fresh-bottom-nav-scroll">
        {destinations.map(({ id, label, icon: Icon }) => {
          const active =
            id === "feed"
              ? activeRoute === "feed" || !activeRoute
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
                <Icon size={id === "create" ? 26 : 24} />
              </span>
              <span className="fresh-nav-label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
