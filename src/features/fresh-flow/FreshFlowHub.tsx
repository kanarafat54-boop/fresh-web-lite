import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
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
import { supabase } from "../../lib/supabase";

type FreshFlowSection = FreshFlowRouteId;

/**
 * Top navigation (1 of exactly 2): which media you are in.
 * Bottom navigation (2 of 2, BottomNav.tsx): platform destinations.
 * Shorts is the bottom bar's Flow entry, so it is intentionally not repeated here.
 */
const TOP_NAVIGATION: Array<{ label: string; route: string; isActive: (section: string, systemId?: string) => boolean }> = [
  { label: "Discover", route: "fresh-flow", isActive: (section) => section === "fresh-flow" },
  { label: "Videos", route: "fresh-flow-long-videos", isActive: (section) => section === "fresh-flow-long-videos" },
  { label: "News / Posts", route: "fresh-flow-news-posts", isActive: (section) => section === "fresh-flow-news-posts" },
  { label: "Live", route: "fresh-flow-system-live-creation", isActive: (_section, systemId) => systemId === "live-creation" || systemId === "fresh-live" },
  { label: "VR / AR", route: "fresh-flow-ar-vr", isActive: (section) => section === "fresh-flow-ar-vr" },
  { label: "Podcasts", route: "fresh-flow-podcasts", isActive: (section) => section === "fresh-flow-podcasts" },
  { label: "Music", route: "fresh-flow-system-fresh-music", isActive: (_section, systemId) => systemId === "fresh-music" },
  { label: "Others", route: "fresh-flow-more", isActive: (section) => section === "fresh-flow-more" },
];

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
  const [navigationVisible, setNavigationVisible] = useState(true);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const setVisibility = (visible: boolean) => {
      setNavigationVisible(visible);
      window.dispatchEvent(new CustomEvent("fresh-flow-navigation-visibility", { detail: { visible } }));
    };
    const markScrolling = () => {
      setVisibility(false);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = setTimeout(() => setVisibility(true), 700);
    };
    document.addEventListener("scroll", markScrolling, { passive: true, capture: true });
    window.addEventListener("scroll", markScrolling, { passive: true });
    return () => {
      document.removeEventListener("scroll", markScrolling, true);
      window.removeEventListener("scroll", markScrolling);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      window.dispatchEvent(new CustomEvent("fresh-flow-navigation-visibility", { detail: { visible: true } }));
    };
  }, [section]);
  useEffect(() => {
    if (!isShortsRoute) setShortsImmersive(false);
  }, [isShortsRoute]);

  const [flowSwitchOpen, setFlowSwitchOpen] = useState(false);
  const flowAvatarInputRef = useRef<HTMLInputElement>(null);
  const flowCameraInputRef = useRef<HTMLInputElement>(null);
  const [freshFlowAvatarUrl, setFreshFlowAvatarUrl] = useState<string | null>(null);
  const [mainProfileAvatarUrl, setMainProfileAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    try { setFreshFlowAvatarUrl(window.localStorage.getItem("fresh-flow-avatar-data-url")); } catch { setFreshFlowAvatarUrl(null); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (!user?.id || isGuest) { setMainProfileAvatarUrl(null); return; }
    void supabase.from("profile_details").select("avatar_url").eq("user_id", user.id).maybeSingle().then(({ data, error }) => {
      if (!cancelled) setMainProfileAvatarUrl(error ? null : (data?.avatar_url ?? null));
    });
    return () => { cancelled = true; };
  }, [user?.id, isGuest]);
  const handleFlowAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) { window.alert("Choose an image smaller than 2 MB for your Fresh Flow avatar."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setFreshFlowAvatarUrl(reader.result);
      try { window.localStorage.setItem("fresh-flow-avatar-data-url", reader.result); } catch { window.alert("This image could not be saved on this device. Try a smaller image."); }
    };
    reader.readAsDataURL(file);
  };
  const [discoveryId, setDiscoveryId] = useState(world.discovery[0]?.id ?? "for-you");
  useEffect(() => {
    setDiscoveryId(world.discovery[0]?.id ?? "for-you");
  }, [world.id]);

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
      className={`fresh-flow-hub ${isOverview ? "fresh-flow-overview" : "fresh-flow-media-experience"}${shortsImmersive ? " immersive-shorts" : ""}${navigationVisible ? " flow-navigation-visible" : " flow-navigation-hidden"}`}
      aria-label="Fresh Flow"
      data-media-world={world.id}
      data-surface={world.surface}
    >
      {showChrome && (
        <header className="fresh-flow-reference-header fresh-flow-unified-header" data-navigation="top">
          <button type="button" className="fresh-flow-unified-brand" onClick={() => setActiveRoute("fresh-flow")} aria-label="Fresh Flow home">
            <span className="fresh-flow-unified-mark" aria-hidden="true">F</span>
            <span className="fresh-flow-brand-wordmark"><strong>Fresh Flow</strong><small>Discover. Connect. Create.</small></span>
          </button>
          <nav className="fresh-flow-header-world-nav" aria-label="Fresh Flow media">
            {TOP_NAVIGATION.map((item) => {
              const active = item.isActive(section, independentSystem?.id);
              return (
                <button key={item.label} type="button" className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setActiveRoute(item.route)}>{item.label}</button>
              );
            })}
          </nav>
          <div className="fresh-flow-header-actions">
            <button type="button" className="fresh-flow-search-icon-button" onClick={openFreshSearch} aria-label="Search Fresh Flow" title="Search">⌕</button>
            <button type="button" className="fresh-flow-search-icon-button fresh-flow-switch-open" onClick={() => setFlowSwitchOpen(true)} aria-label="All media worlds and Flow profile photo" title="All media worlds">⊞</button>
            <button type="button" className="fresh-flow-unified-profile" onClick={() => setActiveRoute("profile")} aria-label="Open your main Fresh ID profile">
              {mainProfileAvatarUrl ? <img src={mainProfileAvatarUrl} alt="" /> : <span>{isAuthenticated ? (user?.email?.slice(0, 1).toUpperCase() || "M") : "?"}</span>}
            </button>
          </div>
        </header>
      )}

      {showChrome && !isOverview && !isShortsRoute && !independentSystem && world.discovery.length > 0 && (
        <div className="fresh-flow-discovery-rail" role="group" aria-label={`${world.label} filters`}>
          {world.discovery.map((mode) => (
            <button key={mode.id} type="button" className={discoveryId === mode.id ? "active" : ""} aria-pressed={discoveryId === mode.id} onClick={() => setDiscoveryId(mode.id)}>
              {mode.label}
            </button>
          ))}
        </div>
      )}

      <main className="fresh-flow-media-content">
        {isOverview ? (
          <FreshFlowHome
            onOpenSearch={openFreshSearch}
            onOpenSystem={(systemId) => {
              const routeMap: Record<string, string> = {
                "fresh-shorts": "fresh-flow-shorts",
                "long-video": "fresh-flow-long-videos",
                "fresh-news": "fresh-flow-news-posts",
                "fresh-posts": "fresh-flow-news-posts",
                "vr-ar-spatial": "fresh-flow-ar-vr",
                "fresh-podcasts": "fresh-flow-podcasts",
                "fresh-studio": "fresh-flow-system-fresh-studio",
                "fresh-music": "fresh-flow-system-fresh-music",
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
        avatar={{
          url: freshFlowAvatarUrl,
          onUpload: () => flowAvatarInputRef.current?.click(),
          onCamera: () => flowCameraInputRef.current?.click(),
        }}
      />
      <input ref={flowAvatarInputRef} className="fresh-flow-hidden-avatar-input" type="file" accept="image/*" onChange={handleFlowAvatarChange} aria-label="Choose a Fresh Flow avatar image" />
      <input ref={flowCameraInputRef} className="fresh-flow-hidden-avatar-input" type="file" accept="image/*" capture="user" onChange={handleFlowAvatarChange} aria-label="Take a Fresh Flow avatar photo" />

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
