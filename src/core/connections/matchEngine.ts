import type {
  ConnectionCandidate,
  ConnectionQuery,
  DiscoveryPolicy,
  MatchSignal,
  MatchVector,
} from "./types";

export type ConnectionProfile = {
  userId: string;
  policy: DiscoveryPolicy;
  signals: Partial<Record<MatchSignal, string[]>>;
  intents: string[];
};

const DEFAULT_WEIGHTS: Record<MatchSignal, number> = {
  interests: 1,
  skills: 1,
  projects: 1,
  communities: 1,
  languages: 0.8,
  goals: 1,
  professional: 1,
  creator: 0.8,
  learning: 0.9,
  location: 0.4,
  shared_connections: 0.6,
};

const overlapScore = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  const overlap = left.filter((value) => rightSet.has(value.toLowerCase())).length;
  return overlap / Math.max(left.length, right.length);
};

export const scoreMatch = (
  viewer: ConnectionProfile,
  candidate: ConnectionProfile,
  requestedSignals?: MatchSignal[],
): { vector: MatchVector; overallScore: number; reasons: string[]; confidence: number } => {
  const allowed = new Set(viewer.policy.allowedSignals);
  const signals = requestedSignals?.filter((signal) => allowed.has(signal)) ?? viewer.policy.allowedSignals;
  const vector: MatchVector = {};
  const reasons: string[] = [];
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const signal of signals) {
    const score = overlapScore(viewer.signals[signal] ?? [], candidate.signals[signal] ?? []);
    vector[signal] = Math.round(score * 100);
    const weight = DEFAULT_WEIGHTS[signal];
    weightedTotal += score * weight;
    weightTotal += weight;
    if (score > 0) reasons.push(`Shared ${signal.replace("_", " ")}`);
  }

  const overallScore = weightTotal === 0 ? 0 : Math.round((weightedTotal / weightTotal) * 100);
  const confidence = Math.min(1, signals.length / 6);

  return { vector, overallScore, reasons, confidence };
};

export const findMatches = (
  viewer: ConnectionProfile,
  candidates: ConnectionProfile[],
  query: ConnectionQuery,
): ConnectionCandidate[] => {
  if (!viewer.policy.discoverable || viewer.policy.scope === "private") return [];
  if (!viewer.policy.allowOutboundRequests) return [];

  const minimumScore = query.minimumScore ?? 1;
  const excluded = new Set(viewer.policy.excludedUserIds ?? []);

  return candidates
    .filter((candidate) => candidate.userId !== viewer.userId)
    .filter((candidate) => candidate.policy.discoverable)
    .filter((candidate) => candidate.policy.scope !== "private")
    .filter((candidate) => !excluded.has(candidate.userId))
    .filter((candidate) => candidate.policy.allowInboundRequests)
    .filter((candidate) => !query.intent || candidate.intents.includes(query.intent))
    .map((candidate) => {
      const scored = scoreMatch(viewer, candidate, query.signals);
      return {
        userId: candidate.userId,
        intents: candidate.intents as ConnectionCandidate["intents"],
        match: scored.vector,
        overallScore: scored.overallScore,
        reasons: scored.reasons,
        confidence: scored.confidence,
        eligible: scored.overallScore >= minimumScore,
        evaluatedAt: new Date().toISOString(),
      };
    })
    .filter((candidate) => candidate.eligible)
    .sort((left, right) => right.overallScore - left.overallScore);
};
