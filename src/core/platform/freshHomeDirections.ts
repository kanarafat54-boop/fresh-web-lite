import { featureWiringRegistry, type FeatureWiringEntry } from "./featureWiring";

export type FreshHomeDirectionId = "discover" | "connect" | "create" | "learn" | "move" | "think";

export type FreshHomeDirection = {
  id: FreshHomeDirectionId;
  label: string;
  description: string;
  ecosystemIds: string[];
};

/**
 * The Home surface is intentionally smaller than the ecosystem graph.
 * Ecosystems are discovered inside a direction instead of being exposed as a
 * giant technical menu.
 */
export const freshHomeDirections: FreshHomeDirection[] = [
  { id: "discover", label: "Discover", description: "Media, news, search and knowledge", ecosystemIds: ["fresh-flow", "shorts", "live", "sports", "search", "vr-ar", "language"] },
  { id: "connect", label: "Connect", description: "Stories, groups, communities and messages", ecosystemIds: ["stories", "groups", "communities", "calls", "universal-interactions", "notifications"] },
  { id: "create", label: "Create", description: "Create, publish, remix and build", ecosystemIds: ["creator-economy", "ads-campaigns", "api-hub", "ara6"] },
  { id: "learn", label: "Learn", description: "Courses, research and skills", ecosystemIds: ["academy", "language", "search"] },
  { id: "move", label: "Move", description: "Wallet, ownership and commerce", ecosystemIds: ["wallet", "treasure", "crypto", "creator-economy"] },
  { id: "think", label: "Think", description: "Fresh AI, memory and automation", ecosystemIds: ["fresh-ai", "automation", "workspaces", "trust", "moderation"] },
];

export function getDirectionEcosystems(direction: FreshHomeDirectionId): FeatureWiringEntry[] {
  const definition = freshHomeDirections.find((item) => item.id === direction);
  if (!definition) return [];
  return definition.ecosystemIds
    .map((id) => featureWiringRegistry.find((entry) => entry.id === id))
    .filter((entry): entry is FeatureWiringEntry => Boolean(entry));
}
