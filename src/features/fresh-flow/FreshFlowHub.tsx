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
import "./components/FreshFlowSurfacePolish.css";

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

function readInitialTheme(): "dark" | "light" {
  try {
    const saved = window.localStorage.getItem("fresh-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore storage errors
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

/**
 * Fresh Flow Hub — media operating shell.
 * Layer A (Media Director) is organized as a compact media directorate with the Flow Switch retained for overflow.
 * Layer B (Discovery) and Layer C (Experience) stay contextual inside each world.
 */
export default function FreshFlowHub() {
  const { activeRoute, setActiveRoute, openSearch } = useLayout();
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
  const [theme, setTheme] = useState<"dark" | "light">(readInitialTheme);

  useEffect(() => {
    setDiscoveryId(world.discovery[0]?.id ?? "for-you");
  }, [world.id]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("fresh-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

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
        <header className="fresh-flow-reference-header fresh-flow-unified-header">
          <div className="fresh-flow-unified-brand">
            <span className="fresh-flow-unified-mark" aria-hidden="true">
              F
            </span>
            <span>
              <strong>Fresh Flow</strong>
              <small>Everything you watch, read, hear and explore</small>
            </span>
          </div>
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
          <div className="fresh-theme-switch" role="group" aria-label="Appearance">
            <button
              type="button"
              className={theme === "dark" ? "is-active" : ""}
              onClick={() => setTheme("dark")}
              aria-label="Dark mode"
              title="Dark mode"
            >
              ◐
            </button>
            <button
              type="button"
              className={theme === "light" ? "is-active" : ""}
              onClick={() => setTheme("light")}
              aria-label="Light mode"
              title="Light mode"
            >
              ☼
            </button>
          </div>
          <button type="button" className="fresh-flow-wallet-card" onClick={() => setActiveRoute("wallet")} aria-label="Open My Wallet">
            <span>
              <strong>Wallet</strong>
              <small>{walletLabel}</small>
            </span>
            <span className="fresh-flow-wallet-icon" aria-hidden="true">
              ▣
            </span>
          </button>
          <button
            type="button"
            className="fresh-flow-unified-profile"
            onClick={() => setActiveRoute("profile")}
            aria-label={isAuthenticated ? "Open profile" : "Open profile / sign in"}
          >
            <span aria-hidden="true">{isAuthenticated ? "M" : "?"}</span>
          </button>
        </header>
      )}

      {(showChrome || shortsImmersive) && world.discovery.length > 0 && (
        <nav
          className={shortsImmersive ? "fresh-flow-discovery-rail fresh-flow-discovery-rail-immersive" : "fresh-flow-discovery-rail"}
          aria-label={`${world.label} discovery`}
        >
          {world.discovery.map((mode) => (
            <button key={mode.id} type="button" className={discoveryId === mode.id ? "active" : ""} onClick={() => setDiscoveryId(mode.id)}>
              {mode.label}
            </button>
          ))}
          {!shortsImmersive && section === "fresh-flow" && (
            <button type="button" onClick={openFreshSearch} aria-label="Explore Shorts topics">Explore</button>
          )}
        </nav>
      )}

      <main className="fresh-flow-media-content">
        {section === "fresh-flow" ? (
          <FreshFlowShortsExperience onOpenTopic={openTopicSearch} onImmersiveChange={setShortsImmersive} />
        ) : section === "fresh-flow-news-posts" ? (
          <FreshFlowNewsPosts discoveryId={discoveryId} />
        ) : (
          <FreshFlowMediaWorkspace
            {...SECTION_COPY[section as keyof typeof SECTION_COPY]}
            title={SECTION_COPY[section as keyof typeof SECTION_COPY].name}
            discoveryId={discoveryId}
          />
        )}
      </main>

      {!shortsImmersive && (
        <nav className="fresh-flow-bottom-nav" aria-label="Fresh Flow primary navigation">
          <button type="button" className={section === "fresh-flow" ? "active" : ""} aria-current={section === "fresh-flow" ? "page" : undefined} onClick={() => setActiveRoute("fresh-flow")}>
            <span className="fresh-flow-bottom-nav-icon" aria-hidden="true">⚡</span><span>Shorts</span>
          </button>
          <button type="button" className={section === "fresh-flow-long-videos" ? "active" : ""} aria-current={section === "fresh-flow-long-videos" ? "page" : undefined} onClick={() => setActiveRoute("fresh-flow-long-videos")}>
            <span className="fresh-flow-bottom-nav-icon" aria-hidden="true">▶</span><span>Videos</span>
          </button>
          <button type="button" className={section === "fresh-flow-news-posts" ? "active" : ""} aria-current={section === "fresh-flow-news-posts" ? "page" : undefined} onClick={() => setActiveRoute("fresh-flow-news-posts")}>
            <span className="fresh-flow-bottom-nav-icon" aria-hidden="true">▤</span><span>Posts</span>
          </button>
          <button type="button" className={section === "studio" ? "active" : ""} onClick={() => setActiveRoute("studio")}>
            <span className="fresh-flow-bottom-nav-icon" aria-hidden="true">＋</span><span>Create</span>
          </button>
          <button type="button" className={flowSwitchOpen ? "active" : ""} aria-haspopup="dialog" onClick={() => setFlowSwitchOpen(true)}>
            <span className="fresh-flow-bottom-nav-icon" aria-hidden="true">☷</span><span>More</span>
          </button>
        </nav>
      )}

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
