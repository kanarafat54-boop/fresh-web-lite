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

export function cosineSimilarity(a: number[] = [], b: number[] = []): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aNorm += a[i] ** 2;
    bNorm += b[i] ** 2;
  }
  if (!aNorm || !bNorm) return 0;
  return dot / Math.sqrt(aNorm * bNorm);
}

export function scoreCandidate(
  candidate: Candidate,
  weights: RecommendationWeights,
  context?: { queryEmbedding?: number[]; semanticWeight?: number },
): number {
  const base =
    weights.subscription * candidate.subscription +
    weights.niche * candidate.niche +
    weights.length * candidate.length +
    weights.freshness * candidate.freshness;
  const semantic = cosineSimilarity(context?.queryEmbedding, candidate.embedding);
  const semanticWeight = Math.max(0, Math.min(1, context?.semanticWeight ?? 0));
  return base * (1 - semanticWeight) + semantic * semanticWeight;
}

export function rerankCandidates(
  candidates: Candidate[],
  weights: RecommendationWeights,
  context?: { queryEmbedding?: number[]; semanticWeight?: number },
) {
  const normalized = normalizeWeights(weights);
  return [...candidates]
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate, normalized, context) }))
    .sort((a, b) => b.score - a.score);
}
