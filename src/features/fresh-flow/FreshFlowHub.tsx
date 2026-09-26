import { useEffect, useState } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { getWalletSummary, formatWalletBalance, type WalletSummary } from "./core/walletService";
import {
  worldByRouteId,
  type FreshFlowRouteId,
} from "./core/freshFlowArchitecture";
import FreshFlowShortsExperience from "./components/FreshFlowShortsExperience";
import FreshFlowNewsPosts from "./components/FreshFlowNewsPosts";
import FreshFlowMediaWorkspace from "./components/FreshFlowMediaWorkspace";
import FreshFlowSearchSurface from "./components/FreshFlowSearchSurface";
import FreshFlowSwitch from "./components/FreshFlowSwitch";
import "./components/FreshFlow.css";
import "./components/FreshFlowReferenceShell.css";
import "./components/FreshFlowReferenceHeader.css";
import "./components/FreshFlowSwitch.css";

type FreshFlowSection = FreshFlowRouteId;

const SECTION_COPY = {
  "fresh-flow-long-videos": {
    name: "Long Videos",
    description: "Cinematic long-form watching within Fresh Flow — structured player, not a stretched Short.",
    icon: "▶",
    kind: "long-videos" as const,
  },
  "fresh-flow-ar-vr": {
    name: "VR / AR",
    description: "Enter environments — UI recedes once the experience begins.",
    icon: "⬡",
    kind: "ar-vr" as const,
  },
  "fresh-flow-podcasts": {
    name: "Podcasts",
    description: "Audio-first shows and episodes — playback can continue while you navigate.",
    icon: "🎙",
    kind: "podcasts" as const,
  },
  "fresh-flow-more": {
    name: "Others",
    description: "Emerging media layer — music, images, stories, interactive, and future formats.",
    icon: "▦",
    kind: "others" as const,
  },
};

/**
 * Fresh Flow Hub — media operating shell.
 * Layer A (Media Director) is summoned via Flow Switch, not permanent six-button chrome.
 * Layer B (Discovery) and Layer C (Experience) stay contextual inside each world.
 */
export default function FreshFlowHub() {
  const { activeRoute, setActiveRoute, toggleSidebar, notifications, openNotifications, openSearch } = useLayout();
  const { isAuthenticated, user, isGuest } = useFreshId();
  const section = (activeRoute || "fresh-flow") as FreshFlowSection;
  const world = worldByRouteId(section);
  const isOverview = section === "fresh-flow";

  useEffect(() => {
    if (!isOverview) setShortsImmersive(false);
  }, [isOverview]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState<{ tab: "videos" | "posts" | "news" | "web" | "people" | "topics"; query: string } | null>(null);
  const [shortsImmersive, setShortsImmersive] = useState(false);
  const [flowSwitchOpen, setFlowSwitchOpen] = useState(false);
  const [discoveryId, setDiscoveryId] = useState(world.discovery[0]?.id ?? "for-you");

  useEffect(() => {
    setDiscoveryId(world.discovery[0]?.id ?? "for-you");
  }, [world.id]);

  const [wallet, setWallet] = useState<WalletSummary | null | undefined>(undefined);
  useEffect(() => {
    if (!user?.id || isGuest) {
      setWallet(null);
      return;
    }
    let cancelled = false;
    getWalletSummary(user.id)
      .then((summary) => {
        if (!cancelled) setWallet(summary);
      })
      .catch(() => {
        if (!cancelled) setWallet(null);
      });
    return () => {
      cancelled = true;
    };
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

  const showChrome = !shortsImmersive;

  return (
    <div
      className={`fresh-flow-hub ${isOverview ? "fresh-flow-overview" : "fresh-flow-media-experience"}${shortsImmersive ? " immersive-shorts" : ""}`}
      aria-label="Fresh Flow"
      data-media-world={world.id}
      data-surface={world.surface}
    >
      {showChrome && (
        <header className="fresh-flow-brand-header">
          <button type="button" className="fresh-flow-hamburger" onClick={toggleSidebar} aria-label="Open Fresh Web Lite navigation">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <button
            type="button"
            className="fresh-flow-brand-avatar"
            onClick={() => setActiveRoute("profile")}
            aria-label={isAuthenticated ? "Open profile" : "Open profile / sign in"}
          >
            <span className="fresh-flow-avatar-mark">FWL</span>
            <span className="fresh-flow-avatar-plus" aria-hidden="true">
              +
            </span>
          </button>
          <div className="fresh-flow-brand-copy">
            <strong>
              FRESH WEB <span>LITE</span>
            </strong>
            <small>The Universal AI Platform</small>
          </div>
          <button
            type="button"
            className="fresh-flow-notification-card"
            onClick={openNotifications}
            aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ""}`}
          >
            <span className="fresh-flow-bell" aria-hidden="true">
              ♧
            </span>
            <span className="fresh-flow-notification-copy">
              <strong>Notifications</strong>
              <small>{notifications.length ? `${notifications.length} new updates` : "No new updates"}</small>
            </span>
            {notifications.length > 0 && <b className="fresh-flow-notification-badge">{Math.min(notifications.length, 9)}</b>}
            <span className="fresh-flow-card-arrow" aria-hidden="true">
              ›
            </span>
          </button>
          <button type="button" className="fresh-flow-wallet-card" onClick={() => setActiveRoute("wallet")} aria-label="Open My Wallet">
            <span>
              <strong>My Wallet</strong>
              <small>{walletLabel}</small>
            </span>
            <span className="fresh-flow-wallet-icon" aria-hidden="true">
              ▣
            </span>
            <span className="fresh-flow-card-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        </header>
      )}

      {showChrome && (
        <header className="fresh-flow-reference-header">
          <button type="button" className="fresh-flow-search" onClick={openFreshSearch} aria-label="Search anything on Fresh">
            <span className="fresh-flow-search-icon">⌕</span>
            <span className="fresh-flow-search-text">Search anything on Fresh...</span>
            <span className="fresh-flow-search-tool" aria-hidden="true">
              ♩
            </span>
            <span className="fresh-flow-search-tool" aria-hidden="true">
              文
            </span>
          </button>
          <button
            type="button"
            className="fresh-flow-flow-switch-trigger"
            onClick={() => setFlowSwitchOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={flowSwitchOpen}
            aria-label="Open Flow Switch — choose media world"
          >
            <span aria-hidden="true">{world.icon}</span>
            <span>{world.shortLabel}</span>
            <span aria-hidden="true">▾</span>
          </button>
        </header>
      )}

      {showChrome && !isOverview && (
        <div className="fresh-flow-section-bar">
          <button type="button" className="fresh-flow-back-button" onClick={() => setActiveRoute("fresh-flow")} aria-label="Back to Fresh Short">
            <span aria-hidden="true">‹</span>
            <span>Short</span>
          </button>
          <span className="fresh-flow-section-title">
            <span aria-hidden="true">{world.icon}</span>
            {world.label}
          </span>
          <button type="button" className="fresh-flow-flow-switch-trigger" onClick={() => setFlowSwitchOpen(true)} aria-label="Switch media world">
            Switch
          </button>
        </div>
      )}

      {/* Layer B for non-Short worlds; Short owns discovery inside ShortsStream. */}
      {showChrome && !isOverview && world.discovery.length > 0 && (
        <nav className="fresh-flow-discovery-rail" aria-label={`${world.label} discovery`}>
          {world.discovery.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={discoveryId === mode.id ? "active" : ""}
              onClick={() => setDiscoveryId(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </nav>
      )}

      <main className="fresh-flow-media-content">
        {section === "fresh-flow" ? (
          <FreshFlowShortsExperience onOpenTopic={openTopicSearch} onImmersiveChange={setShortsImmersive} />
        ) : section === "fresh-flow-news-posts" ? (
          <FreshFlowNewsPosts />
        ) : (
          <FreshFlowMediaWorkspace
            {...SECTION_COPY[section as keyof typeof SECTION_COPY]}
            title={SECTION_COPY[section as keyof typeof SECTION_COPY].name}
          />
        )}
      </main>

      <FreshFlowSwitch
        open={flowSwitchOpen}
        activeRouteId={section}
        onSelect={(routeId) => setActiveRoute(routeId)}
        onClose={() => setFlowSwitchOpen(false)}
      />

      {searchOpen && (
        <FreshFlowSearchSurface
          onClose={() => {
            setSearchOpen(false);
            setSearchSeed(null);
          }}
          initialTab={searchSeed?.tab}
          initialQuery={searchSeed?.query}
        />
      )}
    </div>
  );
}
