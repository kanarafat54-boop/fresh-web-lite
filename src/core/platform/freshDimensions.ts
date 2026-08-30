/**
 * Fresh dimensional intelligence primitives.
 *
 * These are software abstractions for progressively richer context,
 * relationships, intelligence, and orchestration — not claims about
 * physical dimensions.
 *
 * The primitives deliberately remain UI-agnostic so every Fresh experience
 * can consume the same underlying model.
 */

export type FreshDimension = 4 | 5 | 6 | 7;

export type TemporalContext = {
  observedAt: string;
  validFrom?: string;
  validUntil?: string;
  state?: string;
};

export type Relationship = {
  sourceId: string;
  targetId: string;
  type: string;
  weight?: number;
  observedAt?: string;
};

export type IntelligenceAssessment = {
  confidence: number;
  evidenceIds: string[];
  contradictionIds: string[];
  rationale?: string;
};

export type OrchestrationIntent = {
  id: string;
  goal: string;
  requestedAt: string;
  actorId?: string;
};

export type FreshDimensionalContext = {
  dimension: FreshDimension;
  temporal?: TemporalContext;
  relationships?: Relationship[];
  intelligence?: IntelligenceAssessment;
  intent?: OrchestrationIntent;
};

export function create4DContext(
  temporal: TemporalContext,
): FreshDimensionalContext {
  return { dimension: 4, temporal };
}

export function extendTo5D(
  context: FreshDimensionalContext,
  relationships: Relationship[],
): FreshDimensionalContext {
  return {
    ...context,
    dimension: Math.max(context.dimension, 5) as FreshDimension,
    relationships,
  };
}

export function extendTo6D(
  context: FreshDimensionalContext,
  intelligence: IntelligenceAssessment,
): FreshDimensionalContext {
  return {
    ...context,
    dimension: Math.max(context.dimension, 6) as FreshDimension,
    intelligence,
  };
}

export function extendTo7D(
  context: FreshDimensionalContext,
  intent: OrchestrationIntent,
): FreshDimensionalContext {
  return {
    ...context,
    dimension: Math.max(context.dimension, 7) as FreshDimension,
    intent,
  };
}
