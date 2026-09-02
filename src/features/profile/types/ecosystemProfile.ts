export const FEED_MODES = ["for_you", "social", "learn", "relax", "others"] as const;

export type FeedMode = (typeof FEED_MODES)[number];

/**
 * Ecosystem context belonging to one Universal Fresh ID.
 * It is not a second account: username remains universal.
 */
export interface EcosystemProfile {
  id?: string;
  freshId: string;
  ecosystemId: string;
  title: string;
  description: string;
  enabled: boolean;
  level: number;
  feedModes: FeedMode[];
  metadata?: Record<string, unknown>;
}
