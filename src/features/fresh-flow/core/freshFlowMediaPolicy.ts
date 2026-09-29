export type FreshFlowMediaConnection = "fast" | "slow" | "offline";

export type FreshFlowMediaPolicy = {
  activePreload: "auto" | "metadata" | "none";
  neighborPreload: "auto" | "metadata" | "none";
  maxConcurrentMedia: number;
  retainBehind: number;
  retainAhead: number;
};

export function getFreshFlowMediaPolicy(
  connection: FreshFlowMediaConnection,
  saveData = false,
): FreshFlowMediaPolicy {
  if (connection === "offline" || saveData) {
    return { activePreload: "metadata", neighborPreload: "none", maxConcurrentMedia: 1, retainBehind: 0, retainAhead: 1 };
  }
  if (connection === "slow") {
    return { activePreload: "auto", neighborPreload: "metadata", maxConcurrentMedia: 2, retainBehind: 0, retainAhead: 1 };
  }
  return { activePreload: "auto", neighborPreload: "auto", maxConcurrentMedia: 3, retainBehind: 1, retainAhead: 2 };
}

export function canAutoplayMuted(hasUserGesture: boolean, prefersReducedMotion: boolean): boolean {
  return !prefersReducedMotion && (hasUserGesture || typeof navigator !== "undefined");
}
