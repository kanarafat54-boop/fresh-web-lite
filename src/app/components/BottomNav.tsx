import { useCallback, useEffect, useState } from "react";
import { HomeIcon, FeedIcon, AIIcon, PlusIcon, MoreIcon } from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import { ALL_NAV_ITEMS, isMobilePrimaryRoute, isNavItemActive } from "../navigation/navModel";
import MoreSheet from "./MoreSheet";
import "./BottomNav.css";

/** Mobile bar: Home · Flow · Create · AI · More. "More" opens every other workspace, grouped by purpose. */
type BottomDestination = { id: string; label: string; icon: typeof HomeIcon };
const primaryDestinations: BottomDestination[] = [
  { id: "feed", label: "Home", icon: HomeIcon },
  { id: "fresh-flow", label: "Flow", icon: FeedIcon },
  { id: "studio", label: "Create", icon: PlusIcon },
  { id: "ai", label: "AI", icon: AIIcon },
];

/** Window event other controls (e.g. the top-bar menu) can fire to open the same sheet. */
export const OPEN_MORE_EVENT = "fresh-nav-more-open";

export default function BottomNav() {
  const { activeRoute, setActiveRoute } = useLayout();
  const [moreOpen, setMoreOpen] = useState(false);
  const [flowNavigationVisible, setFlowNavigationVisible] = useState(true);
  const closeMore = useCallback(() => setMoreOpen(false), []);

  useEffect(() => {
    const open = () => setMoreOpen(true);
    const visibility = (event: Event) => {
      const detail = (event as CustomEvent<{ visible?: boolean }>).detail;
      setFlowNavigationVisible(detail?.visible !== false);
    };
    window.addEventListener(OPEN_MORE_EVENT, open);
    window.addEventListener("fresh-flow-navigation-visibility", visibility);
    return () => {
      window.removeEventListener(OPEN_MORE_EVENT, open);
      window.removeEventListener("fresh-flow-navigation-visibility", visibility);
    };
  }, []);

  const moreActive = !isMobilePrimaryRoute(activeRoute);
  const isFreshFlowRoute = activeRoute === "fresh-flow" || (activeRoute?.startsWith("fresh-flow-") ?? false);
  const freshFlowDestinations = [
    { id: "feed", label: "Home", icon: "⌂" },
    { id: "fresh-flow-shorts", label: "Shorts", icon: "▶" },
    { id: "fresh-flow-system-fresh-studio", label: "Creator Studio", icon: "＋" },
    { id: "fresh-flow-long-videos", label: "Video", icon: "▻" },
    { id: "communication", label: "Messages", icon: "▤" },
    { id: "fresh-mail", label: "Fresh Mail", icon: "✉" },
  ];

  return (
    <>
      <nav className={`fresh-bottom-nav${isFreshFlowRoute ? " fresh-flow-bottom-nav" : ""}${isFreshFlowRoute && !flowNavigationVisible ? " flow-navigation-hidden" : ""}`} aria-label={isFreshFlowRoute ? "Fresh Flow navigation" : "Fresh primary navigation"}>
        <div className="fresh-bottom-nav-scroll">
          {isFreshFlowRoute ? freshFlowDestinations.map(({ id, label, icon }) => {
            const active = id === "feed" ? activeRoute === "feed" : id === "fresh-flow-shorts" ? activeRoute === "fresh-flow-shorts" : activeRoute === id || (id === "fresh-flow-long-videos" && activeRoute === id);
            return (
              <button key={id} type="button" className={`fresh-nav-item fresh-flow-nav-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined} aria-label={label} onClick={() => setActiveRoute(id)}>
                <span className="fresh-nav-icon fresh-flow-nav-glyph" aria-hidden="true">{icon}</span>
                <span className="fresh-nav-label">{label}</span>
              </button>
            );
          }) : primaryDestinations.map(({ id, label, icon: Icon }) => {
            const item = ALL_NAV_ITEMS.find((candidate) => candidate.id === id);
            const active = item ? isNavItemActive(item, activeRoute) : false;
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
          {!isFreshFlowRoute && (
          <button
            type="button"
            className={`fresh-nav-item${moreActive ? " active" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-label="More: all Fresh workspaces"
            onClick={() => setMoreOpen(true)}
          >
            <span className="fresh-nav-icon" aria-hidden="true">
              <MoreIcon size={24} />
            </span>
            <span className="fresh-nav-label">More</span>
          </button>
          )}
        </div>
      </nav>
      <MoreSheet open={moreOpen} onClose={closeMore} />
    </>
  );
}
