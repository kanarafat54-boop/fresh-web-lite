import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { loadFreshFlowShorts, FRESH_FLOW_SHORTS_PAGE_SIZE, type FreshFlowLoadOptions } from "../core/loadFreshFlowShorts";
import { rankFreshFlow, rankTrending } from "../core/FreshFlowRanking";
import { rankForYou } from "../../shorts/core/ForYouRanking";
import {
  FRESH_SHORTS_PREFETCH_RADIUS,
  getActiveIndex,
  getMediaWindow,
  releaseDistantMedia,
  retryVideo,
  shouldFetchNextPage,
  syncVideoPlayback,
} from "../../shorts/core/FreshShortsRuntime";
import { sendGift, getGiftTotals, type GiftTotal } from "../core/giftService";
import { interactWithShort, removeShortInteraction } from "../../shorts/core/ShortsUniversalInteractionAdapter";
import { getEcosystemProfile, upsertEcosystemProfile, FRESH_FLOW_FEED_MODES } from "../../profile/services/ecosystemProfileService";
import type { UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";
import type { Short } from "../../shorts/types/short";
import { getSocialAuthorIds } from "../core/social";
import "./FreshFlow.css";

type SubTab = "for-you" | "trending" | "following" | "fresh-picks";
type FilterMode = "all" | "social" | "learn" | "relax";
type AdvancedAction = "quote" | "remix" | "duet" | "collaborate" | "edit" | "captions" | "effects" | "trim" | "speed" | "stickers" | "sound" | "green-screen";

const SUB_TABS: Array<{ id: SubTab; label: string; icon: string }> = [
  { id: "for-you", label: "For You", icon: "★" },
  { id: "trending", label: "Trending", icon: "↗" },
  { id: "following", label: "Following", icon: "👤" },
  { id: "fresh-picks", label: "Fresh Picks", icon: "✦" },
];

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "learn", label: "Learn" },
  { id: "relax", label: "Relax" },
];

const ADVANCED_ACTIONS: Array<{ id: AdvancedAction; label: string; icon: string; description: string }> = [
  { id: "quote", label: "Quote", icon: "❝", description: "Create a quoted response to this Short." },
  { id: "remix", label: "Remix", icon: "✦", description: "Open Creator Studio to remix this Short." },
  { id: "duet", label: "Duet", icon: "◫", description: "Open Creator Studio for a side-by-side duet." },
  { id: "collaborate", label: "Collaborate", icon: "♧", description: "Invite this creator into a collaboration." },
  { id: "edit", label: "Edit tools", icon: "✂", description: "Rotate, speed, text overlay and True Mode editor tools." },
  { id: "trim", label: "Trim", icon: "⏱", description: "Cut start and end points for a tighter Short." },
  { id: "speed", label: "Speed", icon: "⏩", description: "0.5x–2x playback speed for remix pacing." },
  { id: "captions", label: "Captions", icon: "CC", description: "Auto-captions and caption safe-area tools." },
  { id: "effects", label: "Effects", icon: "✦", description: "Filters, transitions and AI-assisted effects." },
  { id: "stickers", label: "Stickers", icon: "★", description: "Stickers, emojis and on-screen reactions." },
  { id: "sound", label: "Sound", icon: "♪", description: "Original sound, voiceover and music library." },
  { id: "green-screen", label: "Green screen", icon: "▣", description: "Replace background with any scene or feed." },
];

export default function FreshFlowShortsStream() {
  return <div className="fresh-flow-empty">Fresh Flow Shorts loading…</div>;
}
