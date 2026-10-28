import { useEffect, useRef, useState } from "react";
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
import FreshFlowHome from "./components/FreshFlowHome";
import FreshFlowSystemExperience from "./components/FreshFlowSystemExperience";
import { getFreshFlowSystem } from "./core/freshFlowSystemRegistry";

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
  const isOverview = section === "fresh-flow";
  const isShortsRoute = section === "fresh-flow-shorts";
  const world = isShortsRoute ? worldByRouteId("fresh-flow") : worldByRouteId(section);
  const systemRoutePrefix = "fresh-flow-system-";
  const independentSystem = section.startsWith(systemRoutePrefix) ? getFreshFlowSystem(section.slice(systemRoutePrefix.length)) : undefined;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState<{ tab: "videos" | "posts" | "news" | "web" | "people" | "topics"; query: string } | null>(null);
  const [shortsImmersive, setShortsImmersive] = useState(false);
  useEffect(() => {
    if (!isShortsRoute) setShortsImmersive(false);
  }, [isShortsRoute]);

  const [flowSwitchOpen, setFlowSwitchOpen] = useState(false);
  const [liveMenuOpen, setLiveMenuOpen] = useState(false);
  const previousRoute = useRef<string>("fresh-flow");
  const currentRoute = useRef<string>(section);
  useEffect(() => {
    if (section !== currentRoute.current) {
      previousRoute.current = currentRoute.current;
      currentRoute.current = section;
    }
  }, [section]);
  const goBack = () => setActiveRoute(previousRoute.current !== section ? previousRoute.current : "fresh-flow");
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

  const showChrome = !shortsImmersive && !independentSystem;

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

      {showChrome && (
        <nav className="fresh-flow-world-nav" aria-label="Fresh Flow navigation">
          <button type="button" onClick={() => setActiveRoute("feed")} aria-label="Return to Fresh Web Lite home">⌂ Home</button>
          <button type="button" className={isShortsRoute ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-shorts")}>Shorts</button>
          <button type="button" className={section === "fresh-flow-long-videos" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-long-videos")}>Videos</button>
          <div className="fresh-flow-live-nav">
            <button type="button" className={section === "fresh-flow-system-live-creation" || section === "fresh-flow-system-radio-audio-live" ? "active" : ""} onClick={() => setLiveMenuOpen((open) => !open)} aria-expanded={liveMenuOpen} aria-haspopup="menu">● Live ▾</button>
            {liveMenuOpen && <div className="fresh-flow-live-menu" role="menu" aria-label="Live experiences">
              <button type="button" role="menuitem" onClick={() => { setActiveRoute("fresh-flow-system-live-creation"); setLiveMenuOpen(false); }}>Video Live & Broadcast</button>
              <button type="button" role="menuitem" onClick={() => { setActiveRoute("fresh-flow-system-radio-audio-live"); setLiveMenuOpen(false); }}>Audio Live & Rooms</button>
              <button type="button" role="menuitem" onClick={() => { setActiveRoute("fresh-flow-system-events-performances"); setLiveMenuOpen(false); }}>Events & Performances</button>
              <button type="button" role="menuitem" onClick={() => { setActiveRoute("fresh-flow-system-gaming-esports"); setLiveMenuOpen(false); }}>Gaming & Esports Live</button>
            </div>}
          </div>
          <button type="button" onClick={() => setActiveRoute("communication")}>Messages</button>
          <button type="button" onClick={() => setActiveRoute("fresh-mail")}>Fresh Mail</button>
          <button type="button" className={section === "fresh-flow-ar-vr" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-ar-vr")}>VR / AR</button>
          <button type="button" className={section === "fresh-flow-podcasts" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-podcasts")}>Podcasts</button>
          <button type="button" className={section === "fresh-flow-more" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-more")}>Others</button>
        </nav>
      )}

      {showChrome && !isOverview && (
        <div className="fresh-flow-section-bar">
          <button type="button" className="fresh-flow-back-button" onClick={goBack} aria-label="Back to previous experience">
            <span aria-hidden="true">‹</span>
            <span>Back</span>
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

      {((showChrome && !isOverview) || (isShortsRoute && shortsImmersive)) && world.discovery.length > 0 && (
        <nav
          className={shortsImmersive ? "fresh-flow-discovery-rail fresh-flow-discovery-rail-immersive" : "fresh-flow-discovery-rail"}
          aria-label={`${world.label} discovery`}
        >
          {world.discovery.map((mode) => (
            <button key={mode.id} type="button" className={discoveryId === mode.id ? "active" : ""} onClick={() => setDiscoveryId(mode.id)}>
              {mode.label}
            </button>
          ))}
        </nav>
      )}

      <main className="fresh-flow-media-content">
        {isOverview ? (
          <FreshFlowHome
            onOpenSearch={openFreshSearch}
            onOpenRoute={setActiveRoute}
            onOpenSystem={(systemId) => {
              const routeMap: Record<string, string> = {
                "fresh-shorts": "fresh-flow-shorts",
                "long-video": "fresh-flow-long-videos",
                "fresh-news": "fresh-flow-news-posts",
                "fresh-posts": "fresh-flow-news-posts",
                "vr-ar-spatial": "fresh-flow-ar-vr",
                "fresh-podcasts": "fresh-flow-podcasts",
                "fresh-studio": "fresh-flow-system-fresh-studio",
              };
              setActiveRoute(routeMap[systemId] ?? `fresh-flow-system-${systemId}`);
            }}
          />
        ) : isShortsRoute ? (
          <FreshFlowShortsExperience onOpenTopic={openTopicSearch} onImmersiveChange={setShortsImmersive} />
        ) : independentSystem ? (
          <FreshFlowSystemExperience
            system={independentSystem}
            onBack={() => setActiveRoute("fresh-flow")}
            onOpenStudio={() => setActiveRoute("fresh-flow-system-fresh-studio")}
          />
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
