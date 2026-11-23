/**
 * Evidence index for Fresh Unified Colab experiments 6–9.
 * This is experiment metadata only; it does not load weights or change serving.
 */
export type FreshAIColabExperimentKind = "evaluation" | "readiness-assessment" | "fine-tuning";
export type FreshAIColabExperimentStatus =
  | "completed"
  | "prepared-not-executed"
  | "notebook-reported-technically-verified";

export type FreshAIColabExperiment = {
  run: 6 | 7 | 8 | 9;
  runId: string;
  kind: FreshAIColabExperimentKind;
  status: FreshAIColabExperimentStatus;
  promotionEligible: false;
  sourceNotebook: string;
  summary: string;
};

export const FRESH_AI_COLAB_EXPERIMENTS: readonly FreshAIColabExperiment[] = [
  {
    run: 6,
    runId: "fresh-unified-run6-evaluation",
    kind: "evaluation",
    status: "completed",
    promotionEligible: false,
    sourceNotebook: "fresh-ai-run6-google-colab-v2.ipynb",
    summary: "Same-data comparison: Run 5 did not distinguish from Run 3; Run 4 is a leaky reference only."
  },
  {
    run: 7,
    runId: "fresh-unified-run7-readiness",
    kind: "readiness-assessment",
    status: "prepared-not-executed",
    promotionEligible: false,
    sourceNotebook: "fresh-ai-run7-google-colab-v2.ipynb",
    summary: "Gatebook is present but no executed readiness decision or manual review evidence was supplied."
  },
  {
    run: 8,
    runId: "fresh-unified-1-run8",
    kind: "fine-tuning",
    status: "notebook-reported-technically-verified",
    promotionEligible: false,
    sourceNotebook: "fresh-ai-run8-google-colab-v1.ipynb",
    summary: "Taught-fact recall improved to 34/80; Dolly and Wikipedia-Swahili retention regressions block promotion."
  },
  {
    run: 9,
    runId: "fresh-unified-1-run9",
    kind: "fine-tuning",
    status: "notebook-reported-technically-verified",
    promotionEligible: false,
    sourceNotebook: "fresh-ai-run9-google-colab-v1.ipynb",
    summary: "No clear taught-fact or passage-grounding gain; retention regression probe stayed within the 5% threshold."
  }
] as const;

export const FRESH_AI_COLAB_EXPERIMENT_POLICY = Object.freeze({
  modelId: "fresh-unified-1",
  baselineRunId: "fresh-unified-1-run3",
  servingCheckpointUnchanged: true,
  autoPromotion: false,
  checkpointBytesIndependentlyVerifiedInRepo: false
});
