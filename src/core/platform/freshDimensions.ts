/**
 * Fresh dimensional intelligence primitives.
 *
 * Software abstractions for progressively richer context, relationships,
 * intelligence, orchestration, governance, simulation, adaptation, and
 * verified outcomes. The dimensional names are software architecture layers,
 * not claims about physical dimensions.
 */

export type FreshDimension = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

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

/** 8D: governed execution — policy, permissions, risk and constraints. */
export type GovernanceContext = {
  policyIds: string[];
  permissionIds: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  constraints: string[];
};

/** 9D: simulation/planning — compare possible outcomes before execution. */
export type SimulationContext = {
  scenarioId: string;
  assumptions: string[];
  alternatives: string[];
  predictedOutcomes: string[];
};

/** 10D: adaptive coordination — learn from verified results and state changes. */
export type AdaptationContext = {
  priorOutcomeIds: string[];
  adjustments: string[];
  observedAt: string;
};

/** 11D: verified system outcome — immutable evidence of what actually happened. */
export type VerifiedOutcome = {
  outcomeId: string;
  status: "verified" | "failed" | "partial";
  evidenceIds: string[];
  verifiedAt: string;
  summary?: string;
};

export type FreshDimensionalContext = {
  dimension: FreshDimension;
  temporal?: TemporalContext;
  relationships?: Relationship[];
  intelligence?: IntelligenceAssessment;
  intent?: OrchestrationIntent;
  governance?: GovernanceContext;
  simulation?: SimulationContext;
  adaptation?: AdaptationContext;
  outcome?: VerifiedOutcome;
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

export function extendTo5D(context: FreshDimensionalContext, relationships: Relationship[]): FreshDimensionalContext {
  return withDimension({ ...context, relationships }, 5);
}

export function extendTo6D(context: FreshDimensionalContext, intelligence: IntelligenceAssessment): FreshDimensionalContext {
  return withDimension({ ...context, intelligence }, 6);
}

export function extendTo7D(context: FreshDimensionalContext, intent: OrchestrationIntent): FreshDimensionalContext {
  return withDimension({ ...context, intent }, 7);
}

export function extendTo8D(context: FreshDimensionalContext, governance: GovernanceContext): FreshDimensionalContext {
  return withDimension({ ...context, governance }, 8);
}

export function extendTo9D(context: FreshDimensionalContext, simulation: SimulationContext): FreshDimensionalContext {
  return withDimension({ ...context, simulation }, 9);
}

export function extendTo10D(context: FreshDimensionalContext, adaptation: AdaptationContext): FreshDimensionalContext {
  return withDimension({ ...context, adaptation }, 10);
}

export function extendTo11D(context: FreshDimensionalContext, outcome: VerifiedOutcome): FreshDimensionalContext {
  return withDimension({ ...context, outcome }, 11);
}

/**
 * Packages verified context for internal consumers without creating a
 * user-facing dimensional menu. Source IDs are supplied by real producers.
 */
export function createInvisibleKnowledge(context: FreshDimensionalContext, sourceIds: string[]): InvisibleKnowledge {
  return {
    context,
    sourceIds: [...new Set(sourceIds)],
    surfacedAt: new Date().toISOString(),
  };
}
