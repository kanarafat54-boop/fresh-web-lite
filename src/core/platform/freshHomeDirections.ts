import { getEcosystemSurface, type EcosystemSurface } from "./freshEcosystemCatalog";

export type FreshHomeDirectionId = "discover" | "connect" | "create" | "learn" | "move" | "think";

export type FreshHomeDirection = {
  id: FreshHomeDirectionId;
  label: string;
  description: string;
  ecosystemIds: string[];
};

/**
 * Home is the human entry point into the larger platform graph.
 * It intentionally exposes six simple directions while the canonical
 * ecosystem catalog remains much larger underneath.
 */
export const freshHomeDirections: FreshHomeDirection[] = [
  {
    id: "discover",
    label: "Discover",
    description: "Media, news, search and knowledge",
    ecosystemIds: ["fresh-flow", "shorts", "live", "sports", "search", "vr-ar", "language"],
  },
  {
    id: "connect",
    label: "Connect",
    description: "Stories, groups, communities and messages",
    ecosystemIds: ["stories", "groups", "communities", "calls", "universal-interactions", "notifications"],
  },
  {
    id: "create",
    label: "Create",
    description: "Create, publish, remix and build",
    ecosystemIds: ["creator", "ads-campaigns", "api-hub", "ara6"],
  },
  {
    id: "learn",
    label: "Learn",
    description: "Courses, research and skills",
    ecosystemIds: ["academy", "language", "search"],
  },
  {
    id: "move",
    label: "Move",
    description: "Wallet, ownership and commerce",
    ecosystemIds: ["wallet", "treasure", "crypto", "marketplace"],
  },
  {
    id: "think",
    label: "Think",
    description: "Fresh AI, memory, work and automation",
    ecosystemIds: ["fresh-ai", "memory", "automation", "work", "trust", "moderation"],
  },
];

export function getDirectionEcosystems(direction: FreshHomeDirectionId): EcosystemSurface[] {
  const definition = freshHomeDirections.find((item) => item.id === direction);
  if (!definition) return [];

  return definition.ecosystemIds
    .map((id) => getEcosystemSurface(id))
    .filter((entry): entry is EcosystemSurface => Boolean(entry));
}
