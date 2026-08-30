/**
 * Fresh dimensional intelligence primitives.
 *
 * Software abstractions for progressively richer context, relationships,
 * intelligence, and orchestration. They are UI-agnostic and intentionally
 * do not claim anything about physical dimensions.
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

export type InvisibleKnowledge = {
  context: FreshDimensionalContext;
  sourceIds: string[];
  surfacedAt?: string;
};

function withDimension(
  context: FreshDimensionalContext,
  dimension: FreshDimension,
): FreshDimensionalContext {
  return { ...context, dimension: Math.max(context.dimension, dimension) as FreshDimension };
}

export function create4DContext(temporal: TemporalContext): FreshDimensionalContext {
  return { dimension: 4, temporal };
}

export function extendTo5D(
  context: FreshDimensionalContext,
  relationships: Relationship[],
): FreshDimensionalContext {
  return withDimension({ ...context, relationships }, 5);
}

export function extendTo6D(
  context: FreshDimensionalContext,
  intelligence: IntelligenceAssessment,
): FreshDimensionalContext {
  return withDimension({ ...context, intelligence }, 6);
}

export function extendTo7D(
  context: FreshDimensionalContext,
  intent: OrchestrationIntent,
): FreshDimensionalContext {
  return withDimension({ ...context, intent }, 7);
}

/**
 * Packages the verified context for internal consumers without introducing a
 * user-facing 4D/5D/6D/7D surface. No source IDs are invented here.
 */
export function createInvisibleKnowledge(
  context: FreshDimensionalContext,
  sourceIds: string[],
): InvisibleKnowledge {
  return {
    context,
    sourceIds: [...new Set(sourceIds)],
    surfacedAt: new Date().toISOString(),
  };
}
