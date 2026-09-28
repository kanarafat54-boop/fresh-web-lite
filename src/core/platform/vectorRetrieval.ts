export type RetrievalVector = {
  id: string;
  embedding?: number[];
  metadata: Record<string, string | number | boolean>;
};

export type RetrievalWeights = {
  subscription: number;
  niche: number;
  length: number;
  freshness: number;
};

export type RetrievalCandidate = RetrievalVector & {
  subscription: number;
  niche: number;
  length: number;
  freshness: number;
};

export type VectorSearchRequest = {
  query: number[];
  limit: number;
  filter?: Record<string, string | number | boolean>;
};

export interface VectorStore {
  search(request: VectorSearchRequest): Promise<RetrievalVector[]>;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export function scoreRetrievalCandidate(
  candidate: RetrievalCandidate,
  weights: RetrievalWeights,
  semanticScore = 0,
): number {
  return (
    semanticScore * 0.5 +
    weights.subscription * candidate.subscription * 0.2 +
    weights.niche * candidate.niche * 0.15 +
    weights.length * candidate.length * 0.05 +
    weights.freshness * candidate.freshness * 0.05
  );
}

export function rerankRetrievalCandidates(
  candidates: RetrievalCandidate[],
  weights: RetrievalWeights,
  semanticScores = new Map<string, number>(),
): Array<RetrievalCandidate & { score: number }> {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreRetrievalCandidate(candidate, weights, semanticScores.get(candidate.id) ?? 0),
    }))
    .sort((a, b) => b.score - a.score);
}
