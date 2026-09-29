export type RecommendationWeights = {
  subscription: number;
  niche: number;
  length: number;
  freshness: number;
};

export type Candidate = {
  id: string;
  subscription: number;
  niche: number;
  length: number;
  freshness: number;
  embedding?: number[];
};

export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  subscription: 0.25,
  niche: 0.25,
  length: 0.15,
  freshness: 0.35,
};

export function scoreCandidate(candidate: Candidate, weights: RecommendationWeights): number {
  return (
    weights.subscription * candidate.subscription +
    weights.niche * candidate.niche +
    weights.length * candidate.length +
    weights.freshness * candidate.freshness
  );
}

export function rerankCandidates(candidates: Candidate[], weights: RecommendationWeights) {
  return [...candidates]
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate, weights) }))
    .sort((a, b) => b.score - a.score);
}

export function normalizeWeights(weights: RecommendationWeights): RecommendationWeights {
  const values = Object.values(weights);
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  return {
    subscription: Math.max(0, weights.subscription) / total,
    niche: Math.max(0, weights.niche) / total,
    length: Math.max(0, weights.length) / total,
    freshness: Math.max(0, weights.freshness) / total,
  };
}
