import { useEffect, useRef, useState, type ReactNode } from "react";
import { FlagIcon } from "../../../components/Icons";
import * as ShortsIcons from "./shortsIcons";
import { dataSaverLabel, isDataSaverActive, nextDataSaverMode, prefetchRadiusFor, preloadFor, readConnectionHint, readDataSaverMode, writeDataSaverMode, type DataSaverMode } from "../core/shortsDataSaver";
import { ShortsStateScreen } from "./ShortsStateScreen";
import { ShortsFilterSheet } from "./ShortsFilterSheet";
import { applyShortFilters, activeFilterCount, normalizeShortFilters, DEFAULT_SHORT_FILTERS, type ShortFilters } from "../core/shortsFilters";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { loadFreshFlowShorts, FRESH_FLOW_SHORTS_PAGE_SIZE, type FreshFlowLoadOptions } from "../core/loadFreshFlowShorts";
import { rankFreshFlow, rankTrending } from "../core/FreshFlowRanking";
import { rankPersonal, type TasteProfile } from "../../shorts/core/PersonalRanking";
import { loadTasteProfile } from "../core/loadTasteProfile";
import {
  FRESH_SHORTS_PREFETCH_RADIUS,
  getActiveIndex,
  releaseDistantMedia,
  retryVideo,
  shouldFetchNextPage,
} from "../../shorts/core/FreshShortsRuntime";
import { sendGift, getGiftTotals, type GiftTotal } from "../core/giftService";
import { interactWithShort, removeShortInteraction } from "../../shorts/core/ShortsUniversalInteractionAdapter";
import type { UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";
import type { Short } from "../../shorts/types/short";
import { getSocialAuthorIds, setAuthorFollow } from "../core/social";
import { useFreshFlowFeedRefresh } from "../core/useFreshFlowFeedRefresh";
import { useFreshFlowRuntime } from "../core/useFreshFlowRuntime";
import { FreshFlowTelemetryBuffer, type FreshFlowTelemetryEvent } from "../core/freshFlowTelemetry";
import { WatchTracker } from "../core/shortWatchSignals";
import { recordFreshFlowEvents } from "../../../core/platform/freshPlatformRuntime";
import {
  shortDiscoveryToCategory,
  type ShortDiscoveryId,
} from "../core/shortDiscovery";
import ShortsCreatorProfile from "./ShortsCreatorProfile";
import { consumeOpenShortRequest } from "../core/shortsExplore";
import ShortsTopicPage from "./ShortsTopicPage";
import ShortsSharePanel from "./ShortsSharePanel";
import { splitCaption, type TopicKind } from "../core/shortsTopics";
import ShortsRecommendationControls from "./ShortsRecommendationControls";
import { EMPTY_PREFS, addUnique, applyShortPrefs, hashtagsOf, loadShortPrefs, removeValue, saveShortPrefs, type ShortPrefs } from "../core/shortsPreferences";
import { SHORT_REPORT_REASONS, reportShort, setCreatorMuted, shortDeepLink, type ShortReportReason } from "../core/shortsSafety";
import "./FreshFlow.css";

type SubTab = ShortDiscoveryId;
type FilterMode = "all" | "social";
type AdvancedAction = "quote" | "remix" | "duet" | "collaborate" | "edit" | "captions" | "effects";

type FreshFlowShortsStreamProps = {
  onImmersiveChange?: (immersive: boolean) => void;
  onOpenTopic?: (topic: string) => void;
  immersive?: boolean;
  onOpenCreate?: (intent?: { action?: string; sourceShortId?: string; sourceVideoUrl?: string }) => void;
};

/** Layer B from architecture: For You · Following · Trending · Learn · Relax · More */
/** Spec section 2A: For You · Social · Trending · Fresh Picks · Learn · Relax (Filters is the gear). Ids stay compatible with saved positions. */
const SUB_TABS: Array<{ id: SubTab; label: string; icon: ReactNode }> = [
  { id: "for-you", label: "For You", icon: <ShortsIcons.ForYouIcon size={16} /> },
  { id: "following", label: "Following", icon: <ShortsIcons.FollowingIcon size={16} /> },
  { id: "trending", label: "Trending", icon: <ShortsIcons.TrendingIcon size={16} /> },
  { id: "more", label: "Fresh Picks", icon: <ShortsIcons.PicksIcon size={16} /> },
  { id: "learn", label: "Learn", icon: <ShortsIcons.LearnTabIcon size={16} /> },
  { id: "relax", label: "Relax", icon: <ShortsIcons.RelaxIcon size={16} /> },
];

const ADVANCED_ACTIONS: Array<{ id: AdvancedAction; label: string; icon: ReactNode; description: string }> = [
  { id: "quote", label: "Quote", icon: <ShortsIcons.QuoteIcon size={18} />, description: "Create a quoted response to this Short." },
  { id: "remix", label: "Remix", icon: <ShortsIcons.RemixIcon size={18} />, description: "Open Creator Studio to remix this Short." },
  { id: "duet", label: "Duet", icon: <ShortsIcons.DuetIcon size={18} />, description: "Open Creator Studio for a side-by-side duet." },
  { id: "collaborate", label: "Collaborate", icon: <ShortsIcons.CollabIcon size={18} />, description: "Invite this creator into a collaboration." },
  { id: "edit", label: "Edit tools", icon: <ShortsIcons.EditToolsIcon size={18} />, description: "Rotate, speed, text overlay and True Mode editor tools." },
  { id: "captions", label: "Captions", icon: <ShortsIcons.CaptionsIcon size={18} />, description: "Generate or edit captions for this Short." },
  { id: "effects", label: "Effects", icon: <ShortsIcons.EffectsIcon size={18} />, description: "Apply effects and filters in Creator Studio." },
];

const FRESH_FLOW_POSITION_KEY = "fresh-flow-position";
const EMPTY_TASTE: TasteProfile = { author: new Map(), topic: new Map(), media: new Map(), skipped: new Set(), completed: new Set(), events: 0 };
const FRESH_FLOW_SOUND_KEY = "fresh-flow-sound";
const DOUBLE_TAP_MS = 280;

function normalizeSubTab(raw: unknown): SubTab {
  if (raw === "fresh-picks") return "more";
  const ids = new Set(SUB_TABS.map((t) => t.id));
  if (typeof raw === "string" && ids.has(raw as SubTab)) return raw as SubTab;
  return "for-you";
}

function readSavedPosition(): { subTab?: SubTab; filterMode?: FilterMode; currentIndex?: number } {
  try {
    const raw = sessionStorage.getItem(FRESH_FLOW_POSITION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      subTab: normalizeSubTab(parsed.subTab),
      filterMode: parsed.filterMode === "social" ? "social" : "all",
      currentIndex: typeof parsed.currentIndex === "number" ? parsed.currentIndex : undefined,
    };
  } catch {
    return {};
  }
}

export default function FreshFlowShortsStream({
  onImmersiveChange: _onImmersiveChange,
  onOpenTopic: _onOpenTopic,
  immersive: _immersiveProp,
  onOpenCreate,
}: FreshFlowShortsStreamProps = {}) {
  const { user, isGuest } = useFreshId();
  const { pushNotification, setActiveRoute } = useLayout();
  const [subTab, setSubTab] = useState<SubTab>(() => readSavedPosition().subTab ?? "for-you");
  const [filterOpen, setFilterOpen] = useState(false);
  const [shortFilters, setShortFilters] = useState<ShortFilters>(() => {
    try { return normalizeShortFilters(JSON.parse(window.sessionStorage.getItem("fresh-flow-short-filters") ?? "null")); } catch { return DEFAULT_SHORT_FILTERS; }
  });
  const shortFiltersRef = useRef<ShortFilters>(shortFilters);
  shortFiltersRef.current = shortFilters;
  const shortFiltersKey = JSON.stringify(shortFilters);
  const [filterMode, setFilterMode] = useState<FilterMode>(() => readSavedPosition().filterMode ?? "all");
  const restoreIndexRef = useRef<number | null>(readSavedPosition().currentIndex ?? null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [giftTotals, setGiftTotals] = useState<Map<string, GiftTotal>>(new Map());
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<boolean>(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [unavailableNotice, setUnavailableNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [freshAiPanelOpen, setFreshAiPanelOpen] = useState(false);
  const [followingAuthors, setFollowingAuthors] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  const viewedRef = useRef<Set<string>>(new Set());
  const telemetryRef = useRef(new FreshFlowTelemetryBuffer());
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const { replaceQueue, appendQueue, setActive: setRuntimeActive } = useFreshFlowRuntime();
  const [dataSaverMode, setDataSaverMode] = useState<DataSaverMode>(() => readDataSaverMode());
  const dataSaverActive = isDataSaverActive(dataSaverMode, readConnectionHint());
  const prefetchRadius = prefetchRadiusFor(dataSaverActive, FRESH_SHORTS_PREFETCH_RADIUS);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try { return window.localStorage.getItem(FRESH_FLOW_SOUND_KEY) !== "off"; } catch { return true; }
  });
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [playFlash, setPlayFlash] = useState<{ id: string; paused: boolean; key: number } | null>(null);
  const [heartBurst, setHeartBurst] = useState<{ id: string; key: number } | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const flashKeyRef = useRef(0);

  const track = (event: FreshFlowTelemetryEvent, mediaId: string, positionMs?: number, durationMs?: number) => {
    telemetryRef.current.push({ event, mediaId, world: "short", sessionId: sessionIdRef.current, positionMs, durationMs });
    if (telemetryRef.current.size() >= 10) void flushTelemetry();
  };

  const tasteRef = useRef<TasteProfile | null>(null);
  const [openCreatorId, setOpenCreatorId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Short | null>(null);
  const [shareTarget, setShareTarget] = useState<Short | null>(null);
  const [recoOpen, setRecoOpen] = useState(false);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [playbackFor, setPlaybackFor] = useState<{ index: number; rate: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const [topicPage, setTopicPage] = useState<{ kind: TopicKind; value: string } | null>(null);
  const mutedCreatorsRef = useRef<Set<string>>(new Set());
  const prefsRef = useRef<ShortPrefs>(EMPTY_PREFS);
  const shortsRef = useRef<Short[]>([]);
  shortsRef.current = shorts;

  /** Start the feed on a specific Short (from Explore, Search or a creator profile). */
  const focusRequestedShort = async () => {
    const id = consumeOpenShortRequest();
    if (!id) return;
    const index = shortsRef.current.findIndex((item) => item.id === id);
    const container = containerRef.current;
    if (index >= 0) {
      container?.scrollTo({ top: index * container.clientHeight, behavior: "instant" });
      setCurrentIndex(index);
      return;
    }
    try {
      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, { shortIds: [id] });
      if (result.shorts.length === 0) { setUnavailableNotice(true); return; }
      setShorts((current) => [result.shorts[0], ...current.filter((item) => item.id !== id)]);
      setCurrentIndex(0);
      containerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    } catch { setUnavailableNotice(true); }
  };

  const flushTelemetry = async () => {
    if (!user || isGuest || telemetryRef.current.size() === 0) return;
    const records = telemetryRef.current.drain();
    try {
      await recordFreshFlowEvents(records.map((record) => ({
        actorId: user.id,
        mediaId: record.mediaId,
        world: record.world,
        event: record.event,
        sessionId: record.sessionId,
        positionMs: record.positionMs,
        durationMs: record.durationMs,
      })));
    } catch {
      // Telemetry must never block media playback.
    }
  };

  const load = async (tab: SubTab, mode: FilterMode) => {
    setLoading(true);
    setError(null);
    pageRef.current = 0;
    try {
      const options: FreshFlowLoadOptions = { limit: FRESH_FLOW_SHORTS_PAGE_SIZE, offset: 0 };
      const category = shortDiscoveryToCategory(tab);
      if (category) options.category = category;
      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, options);
      if (user && !isGuest) {
        prefsRef.current = await loadShortPrefs(user.id);
        mutedCreatorsRef.current = new Set(prefsRef.current.mutedCreators);
      } else { prefsRef.current = EMPTY_PREFS; mutedCreatorsRef.current = new Set(); }
      let candidates = result.shorts.filter((s) => !mutedCreatorsRef.current.has(s.authorId));
      if (tab === "following") candidates = candidates.filter((s) => s.isFollowingAuthor);
      else if (mode === "social") {
        if (!user || isGuest) candidates = [];
        else {
          const socialIds = new Set(await getSocialAuthorIds(user.id));
          candidates = candidates.filter((s) => socialIds.has(s.authorId));
        }
      }
      // Fresh Picks is discovery: personalised ranking over creators you do not already follow.
      if (tab === "more") candidates = candidates.filter((s) => !s.isFollowingAuthor);
      if (user && !isGuest && (tab === "for-you" || tab === "more")) { await flushTelemetry(); tasteRef.current = await loadTasteProfile(user.id, prefsRef.current.tasteResetAt); }
      else if (!user || isGuest) tasteRef.current = null;
      const rankedBase =
        tab === "trending"
          ? rankTrending(candidates)
          : tab === "for-you" || tab === "more"
            ? rankPersonal(candidates, tasteRef.current ?? EMPTY_TASTE, viewedRef.current)
            : rankFreshFlow(candidates);
      const ranked = applyShortFilters(applyShortPrefs(rankedBase, prefsRef.current), shortFiltersRef.current);
      setShorts(ranked);
      setSavedIds(new Set(result.savedIds));
      replaceQueue(ranked.map((short) => ({
        id: short.id,
        kind: "short",
        world: "short",
        authorId: short.authorId,
        title: short.caption || "Fresh Short",
        description: short.caption || "",
        mediaUrl: short.videoUrl,
        posterUrl: null,
        createdAt: new Date().toISOString(),
        safety: "approved",
      })), null, result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
      setHasMore(result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
      if (user && !isGuest) {
        try {
          setGiftTotals(await getGiftTotals(ranked.map((s) => s.id)));
        } catch {
          /* ignore */
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Fresh Flow.");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadMoreInFlightRef.current || !hasMore || !navigator.onLine) return;
    loadMoreInFlightRef.current = true;
    const nextPage = pageRef.current + 1;
    try {
      const options: FreshFlowLoadOptions = {
        limit: FRESH_FLOW_SHORTS_PAGE_SIZE,
        offset: nextPage * FRESH_FLOW_SHORTS_PAGE_SIZE,
      };
      const category = shortDiscoveryToCategory(subTab);
      if (category) options.category = category;
      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, options);
      let candidates = result.shorts.filter((s) => !mutedCreatorsRef.current.has(s.authorId));
      if (subTab === "following") candidates = candidates.filter((s) => s.isFollowingAuthor);
      else if (filterMode === "social") {
        if (!user || isGuest) candidates = [];
        else {
          const socialIds = new Set(await getSocialAuthorIds(user.id));
          candidates = candidates.filter((s) => socialIds.has(s.authorId));
        }
      }
      if (subTab === "more") candidates = candidates.filter((s) => !s.isFollowingAuthor);
      const rankedBase =
        subTab === "trending"
          ? rankTrending(candidates)
          : subTab === "for-you" || subTab === "more"
            ? rankPersonal(candidates, tasteRef.current ?? EMPTY_TASTE, viewedRef.current)
            : rankFreshFlow(candidates);
      const ranked = applyShortFilters(applyShortPrefs(rankedBase, prefsRef.current), shortFiltersRef.current);
      setShorts((current) => {
        const existing = new Set(current.map((s) => s.id));
        return [...current, ...ranked.filter((s) => !existing.has(s.id))];
      });
      appendQueue(ranked.map((short) => ({
        id: short.id,
        kind: "short",
        world: "short",
        authorId: short.authorId,
        title: short.caption || "Fresh Short",
        description: short.caption || "",
        mediaUrl: short.videoUrl,
        posterUrl: null,
        createdAt: new Date().toISOString(),
        safety: "approved",
      })), null, result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
      pageRef.current = nextPage;
      setHasMore(result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
    } catch {
      /* keep current feed */
    } finally {
      loadMoreInFlightRef.current = false;
    }
  };

  useEffect(() => {
    try { window.sessionStorage.setItem("fresh-flow-short-filters", shortFiltersKey); } catch { /* filters just reset next visit */ }
    void load(subTab, filterMode);
  }, [subTab, filterMode, user?.id, isGuest, shortFiltersKey]);

  useFreshFlowFeedRefresh(() => {
    void load(subTab, filterMode);
  });

  // Offline awareness: show the state, and reload the feed by itself when the connection returns.
  useEffect(() => {
    const goOnline = () => { setOnline(true); void load(subTab, filterMode); };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, filterMode, user?.id, isGuest]);

  useEffect(() => {
    if (!loading) void focusRequestedShort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    const onOpenShort = () => { void focusRequestedShort(); };
    const onOpenCreator = (event: Event) => {
      const authorId = (event as CustomEvent<{ authorId?: string }>).detail?.authorId;
      if (authorId) setOpenCreatorId(authorId);
    };
    window.addEventListener("fresh-shorts-open-short", onOpenShort);
    window.addEventListener("fresh-shorts-open-creator", onOpenCreator);
    try {
      const pending = sessionStorage.getItem("fresh-shorts-open-creator");
      if (pending) { sessionStorage.removeItem("fresh-shorts-open-creator"); setOpenCreatorId(pending); }
    } catch { /* ignore */ }
    return () => {
      window.removeEventListener("fresh-shorts-open-short", onOpenShort);
      window.removeEventListener("fresh-shorts-open-creator", onOpenCreator);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shorts.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const candidates = entries
          .map((entry) => ({
            index: Number((entry.target as HTMLElement).dataset.index),
            ratio: entry.intersectionRatio,
          }))
          .filter((candidate) => Number.isFinite(candidate.index));
        const activeIndex = getActiveIndex(candidates);
        if (activeIndex < 0) return;
        setCurrentIndex((previous) => (previous === activeIndex ? previous : activeIndex));
        if (shorts[activeIndex]) {
          viewedRef.current.add(shorts[activeIndex].id);
          setRuntimeActive(shorts[activeIndex].id);
          telemetryRef.current.push({
            event: "impression",
            mediaId: shorts[activeIndex].id,
            world: "short",
            sessionId: sessionIdRef.current,
          });
          if (telemetryRef.current.size() >= 10) void flushTelemetry();
        }
      },
      { root: container, threshold: [0, 0.6, 1] },
    );
    container.querySelectorAll<HTMLElement>(".fresh-flow-item").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [shorts.length]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current !== null) window.clearTimeout(tapTimerRef.current);
      void flushTelemetry();
    };
  }, [user?.id, isGuest]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FRESH_FLOW_POSITION_KEY, JSON.stringify({ subTab, filterMode, currentIndex }));
    } catch {
      /* ignore */
    }
  }, [subTab, filterMode, currentIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (shouldFetchNextPage(currentIndex, shorts.length, hasMore)) {
        void loadMore();
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [currentIndex, shorts.length, hasMore, subTab, filterMode]);

  // Exactly one video plays. Sound is on after the first gesture; if the browser
  // blocks unmuted autoplay we fall back to muted playback and say so.
  useEffect(() => {
    const nodes = containerRef.current?.querySelectorAll<HTMLVideoElement>("video[data-short-id]") ?? [];
    const videos = new Map<number, HTMLVideoElement>();
    nodes.forEach((video) => {
      const index = Number(video.closest<HTMLElement>(".fresh-flow-item")?.dataset.index);
      if (Number.isFinite(index)) videos.set(index, video);
    });
    videos.forEach((video, index) => {
      if (index !== currentIndex) {
        video.muted = true;
        if (!video.paused) video.pause();
      }
    });
    releaseDistantMedia(videos, currentIndex, prefetchRadius + 2);
    const active = videos.get(currentIndex);
    if (!active) return;
    if (openCreatorId) { active.pause(); return; }
    let cancelled = false;
    active.muted = !soundOn;
    void active.play().then(() => {
      if (!cancelled) setSoundBlocked(false);
    }).catch(async () => {
      if (cancelled || active.muted) return;
      active.muted = true;
      if (soundOn) setSoundBlocked(true);
      try { await active.play(); } catch { /* playback needs a tap; the tap layer starts it */ }
    });
    return () => { cancelled = true; };
  }, [currentIndex, shorts, soundOn, openCreatorId, prefetchRadius]);

  // Pause when the tab/app is hidden; resume the active video when it returns.
  useEffect(() => {
    const onVisibility = () => {
      const video = containerRef.current?.querySelector<HTMLVideoElement>(`.fresh-flow-item[data-index="${currentIndex}"] video`);
      if (!video) return;
      if (document.hidden) { video.pause(); void flushTelemetry(); }
      else void video.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [currentIndex, user?.id, isGuest]);

  // Watch behavior for the active Short: quartiles, loop completions and skips.
  const activeShortId = shorts[currentIndex]?.id;
  useEffect(() => {
    if (!activeShortId) return;
    const item = containerRef.current?.querySelector<HTMLElement>(`.fresh-flow-item[data-index="${currentIndex}"]`);
    const video = item?.querySelector<HTMLVideoElement>("video");
    if (!item || !video) return;
    const fill = item.querySelector<HTMLElement>(".fresh-flow-progress-fill");
    const tracker = new WatchTracker();
    let started = false;
    const onTime = () => {
      const durationMs = video.duration * 1000;
      const positionMs = video.currentTime * 1000;
      if (!Number.isFinite(durationMs) || durationMs <= 0) return;
      if (fill) fill.style.width = `${Math.min(100, (positionMs / durationMs) * 100)}%`;
      if (video.paused) return;
      if (!started) { started = true; track("play_start", activeShortId, positionMs, durationMs); }
      const tick = tracker.update(positionMs, durationMs);
      for (const milestone of tick.milestones) track(milestone, activeShortId, positionMs, durationMs);
      if (tick.completedLoop) track("complete", activeShortId, positionMs, durationMs);
    };
    video.addEventListener("timeupdate", onTime);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      if (!started) return;
      const durationMs = video.duration * 1000;
      if (tracker.leave(durationMs) === "skip") track("skip", activeShortId, Math.round(video.currentTime * 1000), Number.isFinite(durationMs) ? Math.round(durationMs) : undefined);
    };
  }, [activeShortId]);

  // Desktop/keyboard paging: ↓ / PageDown / J next, ↑ / PageUp / K previous.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable='true']") || target.closest("[role='dialog']"))) return;
      const container = containerRef.current;
      if (!container) return;
      const next = event.key === "ArrowDown" || event.key === "PageDown" || event.key.toLowerCase() === "j";
      const previous = event.key === "ArrowUp" || event.key === "PageUp" || event.key.toLowerCase() === "k";
      if (!next && !previous) return;
      event.preventDefault();
      const target_index = Math.max(0, Math.min(shorts.length - 1, currentIndex + (next ? 1 : -1)));
      container.scrollTo({ top: target_index * container.clientHeight, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, shorts.length]);

  useEffect(() => {
    if (restoreIndexRef.current != null && shorts.length > restoreIndexRef.current) {
      const idx = restoreIndexRef.current;
      restoreIndexRef.current = null;
      setCurrentIndex(idx);
      const el = containerRef.current?.querySelector(`[data-index="${idx}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [shorts.length]);

  async function handleReaction(shortId: string, kind: UniversalReactionKind) {
    if (!user || isGuest) {
      pushNotification({ title: "Sign in to react", message: "Sign in to react to Fresh Shorts." });
      return;
    }
    const current = shorts.find((short) => short.id === shortId);
    if (!current) return;
    const previous = current.myReaction as UniversalReactionKind | null | undefined;
    try {
      if (previous === kind) {
        await removeShortInteraction(user.id, shortId, "react");
        setShorts((prev) =>
          prev.map((s) =>
            s.id === shortId
              ? {
                  ...s,
                  myReaction: null,
                  reactionBreakdown: {
                    ...s.reactionBreakdown,
                    [kind]: Math.max(0, (s.reactionBreakdown[kind] ?? 0) - 1),
                  },
                }
              : s,
          ),
        );
        return;
      }

      await interactWithShort(user.id, shortId, "react", { reaction: kind });
      track("like", shortId);
      setShorts((prev) =>
        prev.map((s) =>
          s.id === shortId
            ? {
                ...s,
                myReaction: kind,
                reactionBreakdown: {
                  ...s.reactionBreakdown,
                  ...(previous
                    ? { [previous]: Math.max(0, (s.reactionBreakdown[previous] ?? 0) - 1) }
                    : {}),
                  [kind]: (s.reactionBreakdown[kind] ?? 0) + 1,
                },
              }
            : s,
        ),
      );
    } catch (error) {
      pushNotification({
        title: "Reaction failed",
        message: error instanceof Error ? error.message : "Fresh could not save your reaction. Try again.",
        type: "error",
      });
    }
  }

  async function handleGift(short: Short, amountMinor: string) {
    if (!user || isGuest) {
      pushNotification({ title: "Sign in to send gifts", message: "Sign in to send gifts to creators." });
      return;
    }
    if (short.authorId === user.id) {
      pushNotification({ title: "Gift unavailable", message: "You cannot send a gift to yourself." });
      return;
    }
    try {
      await sendGift(short.id, short.authorId, amountMinor);
      const totals = await getGiftTotals([short.id]);
      setGiftTotals((prev) => {
        const next = new Map(prev);
        const t = totals.get(short.id);
        if (t) next.set(short.id, t);
        return next;
      });
      pushNotification({ title: "Gift sent", message: "Your gift was recorded successfully.", type: "success" });
    } catch (error) {
      pushNotification({
        title: "Gift failed",
        message: error instanceof Error ? error.message : "Fresh could not send the gift. Try again.",
        type: "error",
      });
    }
  }

  async function handleFollow(short: Short) {
    if (!user || isGuest) { pushNotification({ title: "Sign in to follow", message: "Follow creators and keep their content in your Following feed." }); return; }
    const next = !followingAuthors.has(short.authorId);
    try {
      await setAuthorFollow(user.id, short.authorId, next);
      setFollowingAuthors((current) => { const copy = new Set(current); if (next) copy.add(short.authorId); else copy.delete(short.authorId); return copy; });
      pushNotification({ title: next ? "Following creator" : "Unfollowed creator", message: `@${short.authorUsername} is ${next ? "now in" : "removed from"} your Following feed.` });
    } catch (error) {
      pushNotification({ title: "Follow failed", message: error instanceof Error ? error.message : "Fresh could not update the follow right now." });
    }
  }

  function activeVideo(index: number): HTMLVideoElement | null {
    return containerRef.current?.querySelector<HTMLVideoElement>(`.fresh-flow-item[data-index="${index}"] video`) ?? null;
  }

  function togglePlayback(short: Short, index: number) {
    const video = activeVideo(index);
    if (!video) return;
    flashKeyRef.current += 1;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setPlayFlash({ id: short.id, paused: false, key: flashKeyRef.current });
    } else {
      video.pause();
      setPlayFlash({ id: short.id, paused: true, key: flashKeyRef.current });
    }
  }

  /** Single tap = play/pause, double tap = like (never un-like), like TikTok. */
  function handleTap(short: Short, index: number) {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === short.id && now - last.at < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      if (tapTimerRef.current !== null) { window.clearTimeout(tapTimerRef.current); tapTimerRef.current = null; }
      flashKeyRef.current += 1;
      setHeartBurst({ id: short.id, key: flashKeyRef.current });
      if (short.myReaction !== "like") void handleReaction(short.id, "like" as UniversalReactionKind);
      return;
    }
    lastTapRef.current = { id: short.id, at: now };
    if (tapTimerRef.current !== null) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      tapTimerRef.current = null;
      lastTapRef.current = null;
      togglePlayback(short, index);
    }, DOUBLE_TAP_MS);
  }

  function startLongPress(index: number) {
    longPressed.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setPlaybackFor({ index, rate: activeVideo(index)?.playbackRate ?? 1 });
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  function setRate(rate: number) {
    if (!playbackFor) return;
    const video = activeVideo(playbackFor.index);
    if (video) video.playbackRate = rate;
    setPlaybackFor({ ...playbackFor, rate });
  }

  function seekFromPointer(event: React.PointerEvent<HTMLDivElement>, index: number) {
    event.stopPropagation();
    const video = activeVideo(index);
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundBlocked(false);
    try { window.localStorage.setItem(FRESH_FLOW_SOUND_KEY, next ? "on" : "off"); } catch { /* ignore */ }
  }

  /** Called from a real tap, so the browser allows unmuted playback now. */
  function enableSound(index: number) {
    const video = activeVideo(index);
    setSoundOn(true);
    setSoundBlocked(false);
    try { window.localStorage.setItem(FRESH_FLOW_SOUND_KEY, "on"); } catch { /* ignore */ }
    if (video) { video.muted = false; void video.play().catch(() => undefined); }
  }

  async function handleSave(short: Short) {
    if (!user || isGuest) { pushNotification({ title: "Sign in to save", message: "Sign in to save Shorts to your collection." }); return; }
    const saved = savedIds.has(short.id);
    try {
      if (saved) await removeShortInteraction(user.id, short.id, "save");
      else await interactWithShort(user.id, short.id, "save");
      setSavedIds((current) => { const next = new Set(current); if (saved) next.delete(short.id); else next.add(short.id); return next; });
      if (!saved) track("save", short.id);
    } catch (error) {
      pushNotification({ title: "Save failed", message: error instanceof Error ? error.message : "Fresh could not update your saved Shorts.", type: "error" });
    }
  }

  async function handleRepost(short: Short) {
    setAdvancedOpen(false);
    if (!user || isGuest) { pushNotification({ title: "Sign in to repost", message: "Sign in to share Shorts with your followers." }); return; }
    if (short.authorId === user.id) { pushNotification({ title: "Repost unavailable", message: "You cannot repost your own Short." }); return; }
    const reposted = Boolean(short.repostedByMe);
    try {
      if (reposted) await removeShortInteraction(user.id, short.id, "repost");
      else await interactWithShort(user.id, short.id, "repost");
      setShorts((prev) => prev.map((item) => item.id === short.id ? { ...item, repostedByMe: !reposted, repostCount: Math.max(0, item.repostCount + (reposted ? -1 : 1)) } : item));
    } catch (error) {
      pushNotification({ title: "Repost failed", message: error instanceof Error ? error.message : "Fresh could not update your repost.", type: "error" });
    }
  }

  function handleShare(short: Short) {
    setAdvancedOpen(false);
    setShareTarget(short);
  }

  function recordShare(short: Short, channel: "messages" | "copy" | "native") {
    track("share", short.id);
    if (user && !isGuest) void interactWithShort(user.id, short.id, "share", { payload: { channel } }).catch(() => undefined);
  }

  function handleNotInterested(short: Short) {
    setAdvancedOpen(false);
    // Recorded as a skip so ranking learns from it; hides the item for this session.
    track("skip", short.id);
    setShorts((prev) => prev.filter((item) => item.id !== short.id));
    pushNotification({ title: "Hidden", message: "This Short is hidden for now." });
  }

  async function handleReport(short: Short, reason: ShortReportReason) {
    setReportTarget(null);
    if (!user || isGuest) { pushNotification({ title: "Sign in to report", message: "Reports are tied to your account.", type: "error" }); return; }
    try {
      await reportShort(user.id, short.id, reason);
      track("skip", short.id);
      setShorts((prev) => prev.filter((item) => item.id !== short.id));
      pushNotification({ title: "Report sent", message: "Thanks. The Short is hidden for you and queued for review.", type: "success" });
    } catch {
      pushNotification({ title: "Report not sent", message: "Fresh could not save your report. Try again.", type: "error" });
    }
  }

  async function handleMuteCreator(short: Short) {
    setAdvancedOpen(false);
    if (!user || isGuest) { pushNotification({ title: "Sign in to mute", message: "Muted creators are saved to your account.", type: "error" }); return; }
    try {
      mutedCreatorsRef.current = await setCreatorMuted(user.id, short.authorId, true);
      prefsRef.current = { ...prefsRef.current, mutedCreators: [...mutedCreatorsRef.current] };
      setShorts((prev) => prev.filter((item) => item.authorId !== short.authorId));
      pushNotification({ title: `Muted @${short.authorUsername}`, message: "You won't see their Shorts in your feed.", type: "success" });
    } catch {
      pushNotification({ title: "Mute failed", message: "Fresh could not save this. Try again.", type: "error" });
    }
  }

  /** Show more / less / hide topic: saved to the viewer's own preferences and applied to the feed right away. */
  async function updateTopicPrefs(short: Short, mode: "more" | "less" | "hide", onlyTag?: string) {
    setAdvancedOpen(false);
    if (!user || isGuest) { pushNotification({ title: "Sign in to tune your feed", message: "Recommendation controls are saved to your account.", type: "error" }); return; }
    const tags = onlyTag ? [onlyTag] : hashtagsOf(short.caption || "");
    if (tags.length === 0) {
      pushNotification({ title: "No topic on this Short", message: "It has no hashtags, so Fresh can't tell what to change. Not interested still teaches your feed." });
      return;
    }
    const current = prefsRef.current;
    const next: ShortPrefs = mode === "more"
      ? { ...current, interests: addUnique(current.interests, tags), showLessTopics: tags.reduce((list, tag) => removeValue(list, tag), current.showLessTopics) }
      : mode === "less"
        ? { ...current, showLessTopics: addUnique(current.showLessTopics, tags), interests: tags.reduce((list, tag) => removeValue(list, tag), current.interests) }
        : { ...current, mutedTopics: addUnique(current.mutedTopics, tags) };
    try {
      await saveShortPrefs(user.id, next);
      prefsRef.current = next;
      setShorts((prev) => applyShortPrefs(prev, next));
      if (mode === "less") track("skip", short.id);
      pushNotification({ title: mode === "more" ? "You'll see more like this" : mode === "less" ? "You'll see less like this" : `Hidden ${tags.map((t) => `#${t}`).join(" ")}`, message: "Saved to your recommendation controls.", type: "success" });
    } catch {
      pushNotification({ title: "Not saved", message: "Fresh could not save that change. Try again.", type: "error" });
    }
  }

  function openFreshAI(prompt: string) {
    setFreshAiPanelOpen(false);
    setAdvancedOpen(false);
    try { sessionStorage.setItem("fresh-ai-prompt", prompt); } catch { /* ignore */ }
    setActiveRoute("ai");
    window.dispatchEvent(new CustomEvent("fresh-ai-open", { detail: { prompt } }));
  }

  function openAdvanced(action: AdvancedAction, short: Short) {
    setAdvancedOpen(false);
    const intent = {
      action,
      sourceShortId: short.id,
      sourceAuthorId: short.authorId,
      sourceVideoUrl: short.videoUrl,
      sourceCaption: short.caption,
      requestedAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify(intent));
    } catch {
      /* ignore */
    }
    onOpenCreate?.({ action, sourceShortId: short.id, sourceVideoUrl: short.videoUrl });
    window.dispatchEvent(new CustomEvent("fresh-open-creator", { detail: intent }));
  }

  if (loading && shorts.length === 0) {
    return (
      <div className="fresh-flow-stream fresh-flow-loading">
        <ShortsStateScreen kind="loading" title="Loading Fresh Shorts…" />
      </div>
    );
  }

  if (error && shorts.length === 0) {
    return (
      <div className="fresh-flow-stream fresh-flow-error">
        {online ? (
          <ShortsStateScreen kind="error" title="Fresh Shorts could not load" message={error} primary={{ label: "Try again", onClick: () => void load(subTab, filterMode) }} />
        ) : (
          <ShortsStateScreen kind="offline" title="No internet connection" message="Check your connection and try again." primary={{ label: "Try again", onClick: () => void load(subTab, filterMode) }} />
        )}
      </div>
    );
  }

  return (
    <div className="fresh-flow-stream" data-discovery={subTab}>
      <header className="fresh-flow-tabs" role="tablist" aria-label="Fresh Short discovery">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            className={subTab === tab.id ? "active" : ""}
            onClick={() => setSubTab(tab.id)}
          >
            <span aria-hidden>{tab.icon}</span> {tab.label}
          </button>
        ))}
        <button type="button" className="fresh-flow-filter-toggle" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen} aria-label="Filters">
          <ShortsIcons.ManageIcon size={20} />
          {activeFilterCount(shortFilters) > 0 ? <span className="fresh-flow-filter-badge" aria-hidden="true">{activeFilterCount(shortFilters)}</span> : null}
        </button>
      </header>
      {!online && shorts.length > 0 ? <div className="fresh-shorts-offline-banner" role="status">You are offline. Showing Shorts already loaded.</div> : null}
      {unavailableNotice ? (
        <div className="fresh-shorts-offline-banner" role="status">
          This Short is no longer available.{" "}
          <button type="button" onClick={() => setUnavailableNotice(false)} aria-label="Dismiss">Dismiss</button>
        </div>
      ) : null}

      {filterOpen && (
        <ShortsFilterSheet
          filters={shortFilters}
          mode={filterMode}
          onApply={setShortFilters}
          onModeChange={setFilterMode}
          onClose={() => setFilterOpen(false)}
        />
      )}

      <div className="fresh-flow-viewport" ref={containerRef}>
        {shorts.length === 0 ? (
          <div className="fresh-flow-empty">
            <ShortsStateScreen
              kind="empty"
              title={activeFilterCount(shortFilters) > 0 ? "No Shorts match your filters" : subTab === "following" ? "Nothing from people you follow yet" : subTab === "learn" || subTab === "relax" ? `No ${subTab} Shorts yet` : "No Shorts yet"}
              message={activeFilterCount(shortFilters) > 0 ? "Try removing a filter to see more." : subTab === "following" ? "Follow creators and their Shorts will appear here." : "Be the first to create something amazing."}
              primary={activeFilterCount(shortFilters) > 0 ? { label: "Clear filters", onClick: () => setShortFilters(DEFAULT_SHORT_FILTERS) } : { label: "Create Short", onClick: () => setActiveRoute("fresh-flow-system-fresh-studio") }}
              secondary={subTab === "following" ? { label: "Browse For You", onClick: () => setSubTab("for-you") } : undefined}
            />
          </div>
        ) : (
          shorts.map((short, index) => (
            <article
              key={short.id}
              className="fresh-flow-item"
              data-index={index}
              data-short-id={short.id}
            >
              <video
                className="fresh-flow-video"
                data-short-id={short.id}
                src={short.videoUrl}
                playsInline
                muted={!soundOn || index !== currentIndex}
                loop
                preload={preloadFor(index, currentIndex, prefetchRadius)}
                onError={(e) => retryVideo(e.currentTarget, 0)}
              />
              <button type="button" className="fresh-flow-tap-layer" onPointerDown={() => startLongPress(index)} onPointerUp={cancelLongPress} onPointerLeave={cancelLongPress} onPointerCancel={cancelLongPress} onContextMenu={(event) => event.preventDefault()} onClick={() => { if (longPressed.current) { longPressed.current = false; return; } handleTap(short, index); }} aria-label="Play or pause. Double tap to like. Press and hold for playback options." />
              {playFlash?.id === short.id && <span key={playFlash.key} className="fresh-flow-play-flash" aria-hidden="true">{playFlash.paused ? "❚❚" : "▶"}</span>}
              {heartBurst?.id === short.id && <span key={heartBurst.key} className="fresh-flow-heart-burst" aria-hidden="true">❤</span>}
              {index === currentIndex && soundBlocked && (
                <button type="button" className="fresh-flow-sound-pill" onClick={() => enableSound(index)} aria-label="Turn sound on">🔇 Tap for sound</button>
              )}
              <div className="fresh-flow-progress" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} onPointerDown={(event) => seekFromPointer(event, index)}><i className="fresh-flow-progress-fill" /></div>
              <div className="fresh-flow-overlay">
                <div className="fresh-flow-meta">
                  <h3 className={expandedCaptions.has(short.id) ? "expanded" : "clamped"}>{short.caption ? splitCaption(short.caption).map((segment, i) => segment.tag
                    ? <button key={i} type="button" className="fresh-flow-hashtag" onClick={() => setTopicPage({ kind: "hashtag", value: segment.tag as string })}>{segment.text}</button>
                    : <span key={i}>{segment.text}</span>) : "Fresh Short"}</h3>
                  {(short.caption?.length ?? 0) > 80 && (
                    <button type="button" className="fresh-flow-caption-toggle" aria-expanded={expandedCaptions.has(short.id)} onClick={() => setExpandedCaptions((current) => { const next = new Set(current); if (next.has(short.id)) next.delete(short.id); else next.add(short.id); return next; })}>{expandedCaptions.has(short.id) ? "less" : "more"}</button>
                  )}
                  <div className="fresh-flow-author-row">
                    <button type="button" className="fresh-flow-author-link" onClick={() => setOpenCreatorId(short.authorId)} aria-label={`Open @${short.authorUsername} profile`}>
                      <span className="fresh-flow-author-avatar" aria-hidden="true">{(short.authorUsername || "F")[0]?.toUpperCase()}</span>
                      <strong>@{short.authorUsername}</strong>{short.authorVerified && <span className="fresh-flow-verified" title="Verified" aria-label="Verified creator">✔</span>}
                    </button>
                    <button type="button" className="fresh-flow-follow-btn" onClick={() => void handleFollow(short)}>{followingAuthors.has(short.authorId) ? "Following" : "Follow"}</button>
                  </div>
                  <div className="fresh-flow-tags">
                    {short.soundName ? <button type="button" className="fresh-flow-sound-link" onClick={() => setTopicPage({ kind: "sound", value: short.soundName as string })}>♪ {short.soundName}</button> : <span>♪ Original sound</span>}
                    {short.isHot ? <span>🔥 Hot</span> : null}
                  </div>
                </div>
                <div className="fresh-flow-actions">
                  <button type="button" className="fresh-flow-rail-avatar" onClick={() => setOpenCreatorId(short.authorId)} aria-label={`Open @${short.authorUsername} profile`}>
                    <span aria-hidden="true">{(short.authorUsername || "F")[0]?.toUpperCase()}</span>
                  </button>
                  <ReactionPicker
                    myReaction={short.myReaction ?? null}
                    count={Object.values(short.reactionBreakdown).reduce((total, value) => total + value, 0)}
                    variant="short"
                    onReact={(kind) => void handleReaction(short.id, kind as UniversalReactionKind)}
                  />
                  <button type="button" onClick={() => { setOpenCommentsFor(short.id); track("comment_open", short.id); }} aria-label="Comments">
                    <span><ShortsIcons.RailCommentIcon size={26} /></span>
                    <span>{short.commentCount}</span>
                  </button>
                  <button type="button" onClick={() => void handleRepost(short)} aria-label={short.repostedByMe ? "Undo repost" : "Repost"} aria-pressed={Boolean(short.repostedByMe)} className={short.repostedByMe ? "saved" : ""}>
                    <span><ShortsIcons.RailRepostIcon size={26} /></span>
                    <span>{short.repostCount || "Repost"}</span>
                  </button>
                  <button type="button" onClick={() => void handleSave(short)} aria-label={savedIds.has(short.id) ? "Remove from saved" : "Save"} aria-pressed={savedIds.has(short.id)} className={savedIds.has(short.id) ? "saved" : ""}>
                    <span><ShortsIcons.RailSaveIcon size={26} filled={savedIds.has(short.id)} /></span>
                    <span>{savedIds.has(short.id) ? "Saved" : "Save"}</span>
                  </button>
                  <button type="button" onClick={() => void handleShare(short)} aria-label="Share">
                    <span><ShortsIcons.RailShareIcon size={26} /></span>
                    <span>Share</span>
                  </button>
                  <button type="button" onClick={() => setAdvancedOpen((v) => !v)} aria-label="More" aria-expanded={advancedOpen && index === currentIndex}>
                    <span><ShortsIcons.RailMoreIcon size={26} /></span>
                  </button>
                </div>
                {freshAiPanelOpen && index === currentIndex && (
                  <div className="fresh-flow-ai-panel">
                    <div className="fresh-flow-ai-panel-header"><div><strong>Fresh AI</strong><small>Understand this Short without leaving Flow.</small></div><button type="button" onClick={() => setFreshAiPanelOpen(false)} aria-label="Close Fresh AI">×</button></div>
                    <button type="button" onClick={() => openFreshAI(`Explain this Fresh Short in a concise way. Include the main idea, important context, and anything a viewer should know. Caption: ${short.caption || "No caption provided."}`)}><strong>Instant Knowledge</strong><small>Get an AI-generated explanation and context.</small></button>
                    <button type="button" onClick={() => openFreshAI(`Research this Fresh Short and identify relevant supporting context, related topics, and trustworthy sources. Clearly separate verified facts from uncertain claims. Caption: ${short.caption || "No caption provided."}`)}><strong>Context & Sources</strong><small>Explore related knowledge and source integrity.</small></button>
                    <button type="button" onClick={() => openFreshAI(`Create a concise multi-format digest of this Fresh Short for me. Summarize what happens, why it matters, and key takeaways. Caption: ${short.caption || "No caption provided."}`)}><strong>Generate Fresh AI Digest</strong><small>Turn the Short into a quick knowledge card.</small></button>
                    <button type="button" onClick={() => openFreshAI(`Help me discover useful products, services, or creator-support options related to this Fresh Short. Do not invent listings or prices. Caption: ${short.caption || "No caption provided."}`)}><strong>Shop / Support Creator</strong><small>Explore useful commerce or creator-support paths.</small></button>
                    <button type="button" onClick={() => openFreshAI(`Explain how I could preserve or collect this memorable moment responsibly, including ownership, rights, and provenance considerations. Do not assume NFT availability. Caption: ${short.caption || "No caption provided."}`)}><strong>Collectible & Provenance</strong><small>Explore ownership and provenance with Fresh AI.</small></button>
                  </div>
                )}
                {advancedOpen && index === currentIndex && (
                  <div className="fresh-flow-advanced" role="group" aria-label="More actions">
                    <button type="button" onClick={() => { setAdvancedOpen(false); void handleGift(short, "100"); }} aria-label="Send gift">
                      <span className="fresh-flow-menu-icon"><ShortsIcons.GiftIcon size={18} /></span> Send gift{(giftTotals.get(short.id)?.count ?? 0) > 0 ? ` · ${giftTotals.get(short.id)?.count}` : ""}
                    </button>
                    <button type="button" onClick={() => { setAdvancedOpen(false); setFreshAiPanelOpen(true); }}>
                      <span className="fresh-flow-menu-icon"><ShortsIcons.AskAIIcon size={18} /></span> Ask Fresh AI
                    </button>
                    <button type="button" onClick={toggleSound}>
                      <span className="fresh-flow-menu-icon">{soundOn ? <ShortsIcons.VolumeOnIcon size={18} /> : <ShortsIcons.VolumeOffIcon size={18} />}</span> {soundOn ? "Mute sound" : "Turn sound on"}
                    </button>
                    <button type="button" onClick={() => { setAdvancedOpen(false); setPlaybackFor({ index, rate: activeVideo(index)?.playbackRate ?? 1 }); }}>
                      <span className="fresh-flow-menu-icon"><ShortsIcons.SpeedIcon size={18} /></span> Playback speed
                    </button>
                    <button type="button" onClick={() => { const next = nextDataSaverMode(dataSaverMode); setDataSaverMode(next); writeDataSaverMode(next); }} title="Stops downloading upcoming Shorts ahead of time. Does not change video quality.">
                      <span className="fresh-flow-menu-icon"><ShortsIcons.DataSaverIcon size={18} /></span> {dataSaverLabel(dataSaverMode, dataSaverActive)}
                    </button>
                    {ADVANCED_ACTIONS.map((a) => (
                      <button key={a.id} type="button" onClick={() => openAdvanced(a.id, short)} title={a.description}>
                        <span className="fresh-flow-menu-icon">{a.icon}</span> {a.label}
                      </button>
                    ))}
                    <hr className="fresh-flow-advanced-divider" aria-hidden="true" />
                    <button type="button" onClick={() => void updateTopicPrefs(short, "more")}>
                      <span className="fresh-flow-menu-icon"><ShortsIcons.MoreLikeIcon size={18} /></span> Show more like this
                    </button>
                    <button type="button" onClick={() => void updateTopicPrefs(short, "less")}>
                      <span className="fresh-flow-menu-icon"><ShortsIcons.LessLikeIcon size={18} /></span> Show less like this
                    </button>
                    {hashtagsOf(short.caption || "").slice(0, 3).map((tag) => (
                      <button key={tag} type="button" onClick={() => void updateTopicPrefs(short, "hide", tag)}>
                        <span className="fresh-flow-menu-icon"><ShortsIcons.HideTopicIcon size={18} /></span> Hide topic #{tag}
                      </button>
                    ))}
                    <button type="button" onClick={() => { setAdvancedOpen(false); if (!user || isGuest) pushNotification({ title: "Sign in", message: "Recommendation controls are saved to your account.", type: "error" }); else setRecoOpen(true); }}>
                      <span className="fresh-flow-menu-icon"><ShortsIcons.ManageIcon size={18} /></span> Manage recommendations
                    </button>
                    <button type="button" onClick={() => handleNotInterested(short)}>
                      <span className="fresh-flow-menu-icon"><ShortsIcons.NotInterestedIcon size={18} /></span> Not interested
                    </button>
                    <button type="button" onClick={() => void handleMuteCreator(short)}>
                      <span className="fresh-flow-menu-icon"><ShortsIcons.MuteCreatorIcon size={18} /></span> Mute @{short.authorUsername}
                    </button>
                    <button type="button" onClick={() => { setAdvancedOpen(false); setReportTarget(short); }}>
                      <span className="fresh-flow-menu-icon"><FlagIcon size={18} /></span> Report
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {openCreatorId && (
        <ShortsCreatorProfile
          authorId={openCreatorId}
          onClose={() => setOpenCreatorId(null)}
          onOpenShort={() => setOpenCreatorId(null)}
          onMessage={() => { setOpenCreatorId(null); setActiveRoute("communication"); }}
          onSignIn={() => { setOpenCreatorId(null); setActiveRoute("auth-signin"); }}
        />
      )}

      {playbackFor && (
        <div className="shorts-sheet-backdrop" onClick={() => setPlaybackFor(null)}>
          <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Playback options" onClick={(event) => event.stopPropagation()}>
            <div className="shorts-sheet-header"><h3>Playback options</h3><button type="button" className="shorts-sheet-close" onClick={() => setPlaybackFor(null)} aria-label="Close">✕</button></div>
            <h4>Speed for this Short</h4>
            <div className="shorts-rate-row" role="group" aria-label="Playback speed">
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button key={rate} type="button" aria-pressed={playbackFor.rate === rate} onClick={() => setRate(rate)}>{rate}×</button>
              ))}
            </div>
            <button type="button" onClick={() => { toggleSound(); }}>{soundOn ? "🔊 Mute sound" : "🔇 Turn sound on"}</button>
            <p>Captions: this Short has no caption track yet. Auto captions need the video worker connection.</p>
          </div>
        </div>
      )}

      {recoOpen && user && (
        <ShortsRecommendationControls userId={user.id} onClose={() => setRecoOpen(false)} onChanged={() => { void loadShortPrefs(user.id).then((fresh) => { prefsRef.current = fresh; mutedCreatorsRef.current = new Set(fresh.mutedCreators); }); }} />
      )}

      {shareTarget && (
        <ShortsSharePanel
          url={shortDeepLink(shareTarget.id, window.location.origin)}
          text={shareTarget.caption ? `${shareTarget.caption} — @${shareTarget.authorUsername} on Fresh` : `A Short by @${shareTarget.authorUsername} on Fresh`}
          signedIn={Boolean(user && !isGuest)}
          onClose={() => setShareTarget(null)}
          onShared={(channel) => recordShare(shareTarget, channel)}
        />
      )}

      {topicPage && (
        <ShortsTopicPage kind={topicPage.kind} value={topicPage.value} onClose={() => setTopicPage(null)} onOpenShort={() => setTopicPage(null)} />
      )}

      {reportTarget && (
        <div className="shorts-sheet-backdrop" onClick={() => setReportTarget(null)}>
          <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Report this Short" onClick={(event) => event.stopPropagation()}>
            <div className="shorts-sheet-header"><h3>Report this Short</h3><button type="button" className="shorts-sheet-close" onClick={() => setReportTarget(null)} aria-label="Close">✕</button></div>
            {SHORT_REPORT_REASONS.map((reason) => (
              <button key={reason.id} type="button" className="shorts-sheet-item" onClick={() => void handleReport(reportTarget, reason.id)}>{reason.label}</button>
            ))}
          </div>
        </div>
      )}

      {openCommentsFor && (
        <CommentPanel targetType="short" targetId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />
      )}
    </div>
  );
}
