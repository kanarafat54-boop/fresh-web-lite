/**
 * Short-world Layer B discovery — aligned with freshFlowArchitecture short.discovery
 */
import { worldById } from "./freshFlowArchitecture";

const ICONS: Record<string, string> = {
  "for-you": "★",
  following: "👤",
  trending: "↗",
  learn: "📚",
  relax: "🌊",
  more: "✦",
};

export type ShortDiscoveryId = "for-you" | "following" | "trending" | "learn" | "relax" | "more";

export const SHORT_DISCOVERY_TABS = worldById("short").discovery.map((d) => ({
  id: d.id as ShortDiscoveryId,
  label: d.label,
  icon: ICONS[d.id] ?? "·",
}));

/** Map architecture discovery → load options category when applicable. */
export function shortDiscoveryToCategory(id: ShortDiscoveryId): "learn" | "relax" | undefined {
  if (id === "learn" || id === "relax") return id;
  return undefined;
}
