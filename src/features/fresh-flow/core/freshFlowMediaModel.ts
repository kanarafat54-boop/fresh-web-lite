/**
 * Fresh Flow media model — thin compatibility layer over the operating architecture.
 * Prefer importing from freshFlowArchitecture for new code.
 */
export type { FreshFlowRouteId as FreshFlowMediaSection } from "./freshFlowArchitecture";
export {
  FRESH_FLOW_MEDIA_WORLDS,
  worldByRouteId,
  worldById,
} from "./freshFlowArchitecture";

import { FRESH_FLOW_MEDIA_WORLDS } from "./freshFlowArchitecture";

/** @deprecated Prefer FRESH_FLOW_MEDIA_WORLDS from freshFlowArchitecture */
export const FRESH_FLOW_MEDIA_NAV = FRESH_FLOW_MEDIA_WORLDS.map((w) => ({
  id: w.routeId,
  label: w.id === "short" ? "Home" : w.label,
  icon: w.icon,
}));

export const FRESH_FLOW_MEDIA_COPY = {
  "fresh-flow-long-videos": {
    name: "Long Videos",
    description: "Cinematic long-form watching within Fresh Flow.",
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
    description: "Audio-first shows and episodes within Fresh Flow.",
    icon: "🎙",
    kind: "podcasts" as const,
  },
  "fresh-flow-more": {
    name: "Others",
    description: "Emerging media layer for future formats.",
    icon: "▦",
    kind: "others" as const,
  },
} as const;
