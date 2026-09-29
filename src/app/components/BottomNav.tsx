import { HomeIcon, FeedIcon, PlusIcon, AIIcon } from "../../components/Icons";
import { freshHomeDirections, type FreshHomeDirectionId } from "../../core/platform/freshHomeDirections";
import { useLayout } from "../contexts/useLayout";
import "./BottomNav.css";

type BottomDestination = { id: string; label: string; icon: typeof HomeIcon; action?: () => void };
const primaryDestinations: BottomDestination[] = [
  { id: "feed", label: "Home", icon: HomeIcon }, { id: "fresh-flow", label: "Flow", icon: FeedIcon },
  { id: "studio", label: "Create", icon: PlusIcon }, { id: "work", label: "Work", icon: FeedIcon }, { id: "profile", label: "Profile", icon: AIIcon },
];
const freshFlowGlobalDestinations: BottomDestination[] = [
  { id: "feed", label: "Home", icon: HomeIcon }, { id: "connect", label: "Chats", icon: FeedIcon },
  { id: "studio", label: "Create", icon: PlusIcon }, { id: "wallet", label: "Wallet", icon: PlusIcon }, { id: "profile", label: "Profile", icon: AIIcon },
];
const shortsDestinations: BottomDestination[] = [
  { id: "fresh-flow", label: "Flow", icon: HomeIcon }, { id: "shorts", label: "For You", icon: FeedIcon },
  { id: "shorts-following", label: "Following", icon: FeedIcon }, { id: "shorts-search", label: "Search", icon: FeedIcon }, { id: "profile", label: "Profile", icon: AIIcon },
];
const ecosystemLabel = (id: string) => {
  const labels: Record<string, string> = { "fresh-flow": "Flow", shorts: "Shorts", live: "Live", sports: "Sports", search: "Search", "vr-ar": "AR / VR", language: "Language", stories: "Stories", groups: "Groups", communities: "Communities", calls: "Calls", "universal-interactions": "Interactions", notifications: "Notifications", "creator-economy": "Creator Economy", "ads-campaigns": "Ads", "api-hub": "API Hub", ara6: "Ara6", academy: "Academy", wallet: "Wallet", treasure: "Treasure", crypto: "Crypto", "fresh-ai": "Fresh AI", automation: "Automation", workspaces: "Workspaces", trust: "Trust", moderation: "Moderation" };
  return labels[id] ?? id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};
const iconForEcosystem = (id: string) => ["fresh-flow", "shorts", "live", "sports", "search", "vr-ar"].includes(id) ? FeedIcon : ["creator-economy", "ads-campaigns", "api-hub", "ara6", "wallet", "treasure", "crypto"].includes(id) ? PlusIcon : AIIcon;
function getActiveDirectorate(activeRoute?: string): FreshHomeDirectionId | undefined {
  if (!activeRoute) return undefined;
  if (freshHomeDirections.some((direction) => direction.id === activeRoute)) return activeRoute as FreshHomeDirectionId;
  if (activeRoute.startsWith("fresh-flow-")) return "discover";
  return freshHomeDirections.find((direction) => direction.ecosystemIds.includes(activeRoute))?.id;
}
export default function BottomNav() {
  const { activeRoute, setActiveRoute, openSearch } = useLayout();
  const isFreshFlow = activeRoute === "fresh-flow" || activeRoute?.startsWith("fresh-flow-");
  const isShorts = activeRoute === "shorts";
  const activeDirectorate = getActiveDirectorate(activeRoute);
  const destinations: BottomDestination[] = isShorts
    ? shortsDestinations.map((item) => item.id === "shorts-search" ? { ...item, action: openSearch } : item)
    : isFreshFlow ? freshFlowGlobalDestinations
    : activeDirectorate ? [{ id: "feed", label: "Home", icon: HomeIcon }, ...freshHomeDirections.find((d) => d.id === activeDirectorate)!.ecosystemIds.map((id) => ({ id, label: ecosystemLabel(id), icon: iconForEcosystem(id) }))].slice(0, 5)
    : primaryDestinations;
  return <nav className="fresh-bottom-nav" aria-label={isShorts ? "Shorts navigation" : isFreshFlow ? "Fresh Flow global navigation" : "Fresh primary navigation"}>
    <div className="fresh-bottom-nav-scroll">
      {destinations.map(({ id, label, icon: Icon, action }) => {
        const active = isShorts ? id === "shorts" : id === "feed" ? activeRoute === "feed" || !activeRoute : activeRoute === id;
        return <button key={id} type="button" className={`fresh-nav-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined} aria-label={label} onClick={() => action ? action() : setActiveRoute(id)}>
          <span className="fresh-nav-icon" aria-hidden="true"><Icon size={id === "studio" ? 26 : 24} /></span><span className="fresh-nav-label">{label}</span>
        </button>;
      })}
    </div>
  </nav>;
}
