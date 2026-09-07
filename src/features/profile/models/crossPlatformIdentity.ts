export type IdentitySource = "fresh" | "google" | "github" | "apple" | "discord" | "x";

export interface IdentityConnection {
  source: IdentitySource;
  externalId: string;
  connectedAt: string;
  verified: boolean;
}

export interface EcosystemPresence {
  ecosystemId: string;
  title: string;
  description: string;
  enabled: boolean;
  level: number;
  feedModes: string[];
  metadata: Record<string, unknown>;
}

export interface CrossPlatformIdentity {
  freshId: string;
  userId: string;
  connections: IdentityConnection[];
  ecosystems: EcosystemPresence[];
  aggregatedActivityCount: number;
  generatedAt: string;
}
