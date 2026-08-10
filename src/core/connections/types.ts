export type ConnectionIntent =
  | "friendship"
  | "collaboration"
  | "mentorship"
  | "professional"
  | "community"
  | "creator"
  | "business"
  | "learning";

export type DiscoveryScope = "global" | "regional" | "local" | "private";

export type MatchSignal =
  | "interests"
  | "skills"
  | "projects"
  | "communities"
  | "languages"
  | "goals"
  | "professional"
  | "creator"
  | "learning"
  | "location"
  | "shared_connections";

export type MatchVector = Partial<Record<MatchSignal, number>>;

export type DiscoveryPolicy = {
  discoverable: boolean;
  scope: DiscoveryScope;
  allowedSignals: MatchSignal[];
  excludedUserIds?: string[];
  allowInboundRequests: boolean;
  allowOutboundRequests: boolean;
};

export type ConnectionCandidate = {
  userId: string;
  intents: ConnectionIntent[];
  match: MatchVector;
  overallScore: number;
  reasons: string[];
  confidence: number;
  eligible: boolean;
  evaluatedAt: string;
};

export type ConnectionQuery = {
  viewerId: string;
  intent?: ConnectionIntent;
  scope?: DiscoveryScope;
  signals?: MatchSignal[];
  minimumScore?: number;
};
