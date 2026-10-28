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
    void supabase.from("profile_details").select("avatar_url").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!cancelled) setMainProfileAvatarUrl(data?.avatar_url ?? null);
    }).catch(() => { if (!cancelled) setMainProfileAvatarUrl(null); });
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
      className={`fresh-flow-hub ${isOverview ? "fresh-flow-overview" : "fresh-flow-media-experience"}${shortsImmersive ? " immersive-shorts" : ""}`}
      aria-label="Fresh Flow"
      data-media-world={world.id}
      data-surface={world.surface}
    >
      {showChrome && (
        <header className="fresh-flow-reference-header fresh-flow-unified-header">
          <div className="fresh-flow-unified-brand" aria-label="Fresh Flow">
            <span className="fresh-flow-unified-mark" aria-hidden="true">F</span>
            <span className="fresh-flow-brand-wordmark"><strong>Fresh Flow</strong><small>Discover. Connect. Create.</small></span>
          </div>
          <nav className="fresh-flow-header-world-nav" aria-label="Fresh Flow media">
            <button type="button" className={section === "fresh-flow-system-live-creation" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-system-live-creation")}>Live</button>
            <button type="button" className={section === "fresh-flow-ar-vr" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-ar-vr")}>VR / AR</button>
            <button type="button" className={section === "fresh-flow-podcasts" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-podcasts")}>Podcasts</button>
            <button type="button" className={section === "fresh-flow-system-fresh-music" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-system-fresh-music")}>Music</button>
            <button type="button" className={section === "fresh-flow-more" ? "active" : ""} onClick={() => setActiveRoute("fresh-flow-more")}>Others</button>
          </nav>
          <button type="button" className="fresh-flow-search-icon-button" onClick={openFreshSearch} aria-label="Search Fresh Flow" title="Search">⌕</button>
          <div className="fresh-flow-profile-actions">
            <button type="button" className="fresh-flow-unified-profile" onClick={() => setActiveRoute("profile")} aria-label="Open your main Fresh ID profile">
              {mainProfileAvatarUrl ? <img src={mainProfileAvatarUrl} alt="" /> : <span>{isAuthenticated ? (user?.email?.slice(0, 1).toUpperCase() || "M") : "?"}</span>}
            </button>
            <button type="button" className="fresh-flow-avatar-action" onClick={() => flowAvatarInputRef.current?.click()} aria-label="Upload or create your Fresh Flow avatar" title="Upload Fresh Flow avatar">
              {freshFlowAvatarUrl ? <img src={freshFlowAvatarUrl} alt="" /> : <span aria-hidden="true">+</span>}
            </button>
            <button type="button" className="fresh-flow-avatar-camera" onClick={() => flowCameraInputRef.current?.click()} aria-label="Take a photo for your Fresh Flow avatar only" title="Camera for Fresh Flow avatar">
              <span aria-hidden="true">⌾</span>
            </button>
            <input ref={flowAvatarInputRef} className="fresh-flow-hidden-avatar-input" type="file" accept="image/*" onChange={handleFlowAvatarChange} aria-label="Choose a Fresh Flow avatar image" />
            <input ref={flowCameraInputRef} className="fresh-flow-hidden-avatar-input" type="file" accept="image/*" capture="user" onChange={handleFlowAvatarChange} aria-label="Take a Fresh Flow avatar photo" />
          </div>
        </header>
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
