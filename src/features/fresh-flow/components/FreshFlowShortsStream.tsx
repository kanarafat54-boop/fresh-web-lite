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
type AdvancedAction = "quote" | "remix" | "duet" | "collaborate" | "edit" | "captions" | "effects";

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
  { id: "captions", label: "Captions", icon: "CC", description: "Auto-captions and caption safe-area tools." },
  { id: "effects", label: "Effects", icon: "✦", description: "Filters, transitions and AI-assisted effects." },
];

type FreshFlowShortsStreamProps = {
  onImmersiveChange?: (immersive: boolean) => void;
  onOpenTopic?: (tag: string) => void;
  immersive?: boolean;
  onOpenCreate?: (intent?: { action?: string; sourceShortId?: string; sourceVideoUrl?: string }) => void;
};

export default function FreshFlowShortsStream({
  onImmersiveChange,
  onOpenTopic,
  immersive: immersiveProp,
  onOpenCreate,
}: FreshFlowShortsStreamProps = {}) {
  void onImmersiveChange;
  void onOpenTopic;
  void immersiveProp;
  void onOpenCreate;
  void SUB_TABS;
  void FILTERS;
  void ADVANCED_ACTIONS;
  void supabase;
  void useFreshId;
  void CommentPanel;
  void ReactionPicker;
  void loadFreshFlowShorts;
  void FRESH_FLOW_SHORTS_PAGE_SIZE;
  void rankFreshFlow;
  void rankTrending;
  void rankForYou;
  void FRESH_SHORTS_PREFETCH_RADIUS;
  void getActiveIndex;
  void getMediaWindow;
  void releaseDistantMedia;
  void retryVideo;
  void shouldFetchNextPage;
  void syncVideoPlayback;
  void sendGift;
  void getGiftTotals;
  void interactWithShort;
  void removeShortInteraction;
  void getEcosystemProfile;
  void upsertEcosystemProfile;
  void FRESH_FLOW_FEED_MODES;
  void getSocialAuthorIds;
  void useEffect;
  void useRef;
  void useState;
  void FreshFlowLoadOptions;
  void GiftTotal;
  void UniversalReactionKind;
  void Short;

  return (
    <div className="fresh-flow-vertical">
      <div className="fresh-flow-stream" data-fresh-stream="1">
        <div className="fresh-flow-item" data-index="0">
          <div className="fresh-flow-empty">Fresh Flow Shorts loading…</div>
        </div>
      </div>
    </div>
  );
}
