import { HomeIcon, FeedIcon, PlusIcon, AIIcon } from "../../components/Icons";
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
export default function BottomNav() {
  const { activeRoute, setActiveRoute, openSearch } = useLayout();
  const isFreshFlow = activeRoute === "fresh-flow" || activeRoute?.startsWith("fresh-flow-");
  const isShorts = activeRoute === "shorts";
  const destinations: BottomDestination[] = isShorts
    ? shortsDestinations.map((item) => item.id === "shorts-search" ? { ...item, action: openSearch } : item)
    : isFreshFlow ? freshFlowGlobalDestinations : primaryDestinations;
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
