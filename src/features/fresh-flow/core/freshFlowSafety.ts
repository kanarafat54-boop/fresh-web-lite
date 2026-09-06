import type { FreshFlowSafety, FreshFlowSafetyDecision } from "./freshFlowContracts";

/**
 * Safety is deliberately independent from ranking. A ranked item must still
 * pass this gate before it is eligible for presentation.
 */
export function canPresentFreshFlowMedia(safety: FreshFlowSafety): boolean {
  return safety.decision === "allow" || safety.decision === "limit";
}

export function getSafetyDecision(safety: FreshFlowSafety): FreshFlowSafetyDecision {
  return safety.decision;
}
