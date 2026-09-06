import { useEffect, useState } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { getWalletSummary, formatWalletBalance, type WalletSummary } from "./core/walletService";
import FreshFlowShortsExperience from "./components/FreshFlowShortsExperience";
import FreshFlowNewsPosts from "./components/FreshFlowNewsPosts";
import FreshFlowMediaWorkspace from "./components/FreshFlowMediaWorkspace";
import FreshFlowSearchSurface from "./components/FreshFlowSearchSurface";
import "./components/FreshFlow.css";
import "./components/FreshFlowReferenceShell.css";
import "./components/FreshFlowReferenceHeader.css";

type FreshFlowSection =
  | "fresh-flow"
  | "fresh-flow-long-videos"
  | "fresh-flow-news-posts"
  | "fresh-flow-ar-vr"
  | "fresh-flow-podcasts"
  | "fresh-flow-more";

const MEDIA_NAV = [
  { id: "fresh-flow", label: "Home", icon: "⌂" },
  { id: "fresh-flow-long-videos", label: "Long Videos", icon: "▷" },
  { id: "fresh-flow-news-posts", label: "News / Posts", icon: "▤" },
  { id: "fresh-flow-ar-vr", label: "AR / VR", icon: "◇" },
  { id: "fresh-flow-podcasts", label: "Podcasts", icon: "♩" },
  { id: "fresh-flow-more", label: "Others", icon: "▦" },
] as const;

const SECTION_COPY = {
  "fresh-flow-long-videos": { name: "Long Videos", description: "Long-form video watching, documentaries and series within Fresh Flow.", icon: "▷", kind: "long-videos" as const },
  "fresh-flow-ar-vr": { name: "AR / VR", description: "Immersive AR and VR experiences connected to Fresh Flow.", icon: "◇", kind: "ar-vr" as const },
  "fresh-flow-podcasts": { name: "Podcasts", description: "Podcast shows, conversations and listening experiences within Fresh Flow.", icon: "♩", kind: "podcasts" as const },
  "fresh-flow-more": { name: "Others", description: "Additional Fresh Flow media and connected experiences.", icon: "▦", kind: "others" as const },
};

export default function FreshFlowHub() {
  const { activeRoute, setActiveRoute, toggleSidebar, notifications, openNotifications, openSearch } = useLayout();
  const { isAuthenticated, user, isGuest } = useFreshId();
  const section = (activeRoute || "fresh-flow") as FreshFlowSection;
  const isOverview = section === "fresh-flow";
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState<{ tab: "videos" | "posts" | "news" | "web" | "people" | "topics"; query: string } | null>(null);

  // undefined = loading, null = no wallet row yet (or guest), WalletSummary = real balance.
  const [wallet, setWallet] = useState<WalletSummary | null | undefined>(undefined);
  useEffect(() => {
    if (!user?.id || isGuest) { setWallet(null); return; }
    let cancelled = false;
    getWalletSummary(user.id)
      .then((summary) => { if (!cancelled) setWallet(summary); })
      .catch(() => { if (!cancelled) setWallet(null); });
    return () => { cancelled = true; };
  }, [user?.id, isGuest]);
  const walletLabel = wallet === undefined ? "Loading…" : wallet ? formatWalletBalance(wallet) : "Open wallet";

  const openTopicSearch = (tag: string) => {
    setSearchSeed({ tab: "topics", query: tag });
    setSearchOpen(true);
  };

  const openFreshSearch = () => {
    openSearch();
    setSearchOpen(true);
  };

  const renderMediaNavigation = (position: "top" | "bottom") => (
    <nav className={`fresh-flow-media-nav fresh-flow-media-nav-${position}`} aria-label="Fresh Flow media navigation">
      {MEDIA_NAV.map((item) => (
        <button key={item.id} type="button" className={`fresh-flow-media-button ${section === item.id ? "active" : ""}`} onClick={() => setActiveRoute(item.id)} aria-current={section === item.id ? "page" : undefined}>
          <span className="fresh-flow-media-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className={`fresh-flow-hub ${isOverview ? "fresh-flow-overview" : "fresh-flow-media-experience"}`} aria-label="Fresh Flow">
      <header className="fresh-flow-brand-header">
        <button type="button" className="fresh-flow-hamburger" onClick={toggleSidebar} aria-label="Open Fresh Web Lite navigation"><span></span><span></span><span></span></button>
        <button type="button" className="fresh-flow-brand-avatar" onClick={() => setActiveRoute("profile")} aria-label={isAuthenticated ? "Open profile" : "Open profile / sign in"}>
          <span className="fresh-flow-avatar-mark">FWL</span>
          <span className="fresh-flow-avatar-plus" aria-hidden="true">+</span>
        </button>
        <div className="fresh-flow-brand-copy">
          <strong>FRESH WEB <span>LITE</span></strong>
          <small>The Universal AI Platform</small>
        </div>
        <button type="button" className="fresh-flow-notification-card" onClick={openNotifications} aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ""}`}>
          <span className="fresh-flow-bell" aria-hidden="true">♧</span>
          <span className="fresh-flow-notification-copy"><strong>Notifications</strong><small>{notifications.length ? `${notifications.length} new updates` : "No new updates"}</small></span>
          {notifications.length > 0 && <b className="fresh-flow-notification-badge">{Math.min(notifications.length, 9)}</b>}
          <span className="fresh-flow-card-arrow" aria-hidden="true">›</span>
        </button>
        <button type="button" className="fresh-flow-wallet-card" onClick={() => setActiveRoute("wallet")} aria-label="Open My Wallet">
          <span><strong>My Wallet</strong><small>{walletLabel}</small></span><span className="fresh-flow-wallet-icon" aria-hidden="true">▣</span><span className="fresh-flow-card-arrow" aria-hidden="true">›</span>
        </button>
      </header>

      <header className="fresh-flow-reference-header">
        <button type="button" className="fresh-flow-search" onClick={openFreshSearch} aria-label="Search anything on Fresh">
          <span className="fresh-flow-search-icon">⌕</span>
          <span className="fresh-flow-search-text">Search anything on Fresh...</span>
          <span className="fresh-flow-search-tool" aria-hidden="true">♩</span>
          <span className="fresh-flow-search-tool" aria-hidden="true">文</span>
        </button>
        <button type="button" className="fresh-flow-reference-more" onClick={toggleSidebar} aria-label="More Fresh Flow navigation"><span>•••</span></button>
      </header>

      {isOverview && renderMediaNavigation("top")}

      <main className="fresh-flow-media-content">
        {section === "fresh-flow" ? (
          <FreshFlowShortsExperience onOpenTopic={openTopicSearch} />
        ) : section === "fresh-flow-news-posts" ? (
          <FreshFlowNewsPosts />
        ) : (
          <FreshFlowMediaWorkspace {...SECTION_COPY[section]} title={SECTION_COPY[section].name} />
        )}
      </main>

      {renderMediaNavigation("bottom")}

      {searchOpen && (
        <FreshFlowSearchSurface
          onClose={() => { setSearchOpen(false); setSearchSeed(null); }}
          initialTab={searchSeed?.tab}
          initialQuery={searchSeed?.query}
        />
      )}
    </div>
  );
}
