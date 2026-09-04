export type FreshFlowMediaSection =
  | "fresh-flow"
  | "fresh-flow-long-videos"
  | "fresh-flow-news-posts"
  | "fresh-flow-ar-vr"
  | "fresh-flow-podcasts"
  | "fresh-flow-more";

/**
 * Fresh Flow is the single parent for every media directorate.
 * Keep this model UI-agnostic so new media experiences cannot accidentally
 * become separate top-level ecosystems.
 */
export const FRESH_FLOW_MEDIA_NAV = [
  { id: "fresh-flow", label: "Home", icon: "⌂" },
  { id: "fresh-flow-long-videos", label: "Long Videos", icon: "▷" },
  { id: "fresh-flow-news-posts", label: "News / Posts", icon: "▤" },
  { id: "fresh-flow-ar-vr", label: "AR / VR", icon: "◇" },
  { id: "fresh-flow-podcasts", label: "Podcasts", icon: "♩" },
  { id: "fresh-flow-more", label: "Others", icon: "▦" },
] as const;

export const FRESH_FLOW_MEDIA_COPY = {
  "fresh-flow-long-videos": {
    name: "Long Videos",
    description: "Long-form video watching, documentaries and series within Fresh Flow.",
    icon: "▷",
    kind: "long-videos" as const,
  },
  "fresh-flow-ar-vr": {
    name: "AR / VR",
    description: "Immersive AR and VR experiences connected to Fresh Flow.",
    icon: "◇",
    kind: "ar-vr" as const,
  },
  "fresh-flow-podcasts": {
    name: "Podcasts",
    description: "Podcast shows, conversations and listening experiences within Fresh Flow.",
    icon: "♩",
    kind: "podcasts" as const,
  },
  "fresh-flow-more": {
    name: "Others",
    description: "Additional Fresh Flow media and connected experiences.",
    icon: "▦",
    kind: "others" as const,
  },
} as const;
