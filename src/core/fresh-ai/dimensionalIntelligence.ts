/**
 * Fresh dimensional intelligence model.
 *
 * Dimensions 1D–11D are reasoning lenses, not claims that Fresh AI can
 * physically perceive higher-dimensional space. Each lens adds structure to
 * the reasoning state while preserving uncertainty when the input does not
 * justify a stronger interpretation.
 */
export type FreshDimension = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type DimensionLens = {
  dimension: FreshDimension;
  name: string;
  focus: string;
  questions: string[];
  reasoningAdds: string[];
};

export type DimensionalReasoning = {
  dimension: FreshDimension;
  lens: DimensionLens;
  interpretation: string;
  constraints: string[];
  unknowns: string[];
  confidence: number;
};

export const FRESH_DIMENSION_LENSES: readonly DimensionLens[] = [
  { dimension: 1, name: "Linear", focus: "sequence and magnitude", questions: ["What changes along one axis?"], reasoningAdds: ["ordering", "distance", "rate"] },
  { dimension: 2, name: "Planar", focus: "relationships across two independent axes", questions: ["How do two variables interact?"], reasoningAdds: ["comparison", "geometry", "tradeoffs"] },
  { dimension: 3, name: "Spatial", focus: "objects, structure and environment", questions: ["What is the structure and how do parts interact?"], reasoningAdds: ["topology", "composition", "spatial relations"] },
  { dimension: 4, name: "Temporal", focus: "change through time", questions: ["What happened, what is happening, and what may happen?"], reasoningAdds: ["state transitions", "causality over time", "temporal validity"] },
  { dimension: 5, name: "Scenario", focus: "alternative timelines and possible states", questions: ["What other outcomes are possible under different assumptions?"], reasoningAdds: ["branching scenarios", "counterfactuals", "path comparison"] },
  { dimension: 6, name: "System State", focus: "many interacting variables and configurations", questions: ["Which system states satisfy the constraints?"], reasoningAdds: ["state spaces", "constraint propagation", "configuration search"] },
  { dimension: 7, name: "Causal Network", focus: "multiple causal structures and interventions", questions: ["Which intervention changes the outcome and why?"], reasoningAdds: ["causal graphs", "intervention analysis", "dependency reasoning"] },
  { dimension: 8, name: "Uncertainty Space", focus: "probability, evidence and competing hypotheses", questions: ["How should confidence change as evidence arrives?"], reasoningAdds: ["hypothesis sets", "confidence calibration", "evidence updating"] },
  { dimension: 9, name: "Knowledge Space", focus: "models, abstractions and interconnected knowledge", questions: ["Which concepts, entities and evidence form the relevant model?"], reasoningAdds: ["knowledge graphs", "abstraction", "cross-domain synthesis"] },
  { dimension: 10, name: "Meta-System", focus: "systems that reason about systems", questions: ["How should the reasoning process itself adapt to the problem?"], reasoningAdds: ["strategy selection", "self-evaluation", "model comparison"] },
  { dimension: 11, name: "Mission Space", focus: "goals, values, constraints, systems and long-horizon consequences", questions: ["Which coherent course best satisfies the mission while preserving truth and safety?"], reasoningAdds: ["long-horizon planning", "multi-objective optimization", "governance"] },
] as const;

export function getDimensionLens(dimension: FreshDimension): DimensionLens {
  return FRESH_DIMENSION_LENSES[dimension - 1];
}

export function reasonAcrossDimensions(input: string, dimensions: FreshDimension[] = [...Array(11)].map((_, i) => (i + 1) as FreshDimension)): DimensionalReasoning[] {
  const normalized = input.trim();
  return dimensions.map((dimension) => {
    const lens = getDimensionLens(dimension);
    const complexity = Math.min(1, normalized.length / 240);
    const confidence = Math.max(0.25, Math.min(0.95, 0.45 + complexity * 0.4 - (dimension > 4 ? 0.03 : 0)));
    return {
      dimension,
      lens,
      interpretation: normalized
        ? `Interpret “${normalized}” through the ${lens.name} lens: ${lens.focus}.`
        : `No input supplied for the ${lens.name} lens.`,
      constraints: ["Do not treat the dimensional lens as physical evidence.", "Do not promote speculation to fact.", "Preserve contradictions and unknowns."],
      unknowns: normalized ? [] : ["Input is empty."],
      confidence,
    };
  });
}
