/**
 * Fresh Web Lite — Shorts Navigation Engine
 *
 * Pure interaction state for the Shorts experience. The UI owns rendering;
 * this engine owns navigation semantics so mobile, keyboard, accessibility,
 * AR and VR clients can share the same model.
 */

export type ShortsContextSpace =
  | "creator"
  | "comments"
  | "related"
  | "evidence"
  | "source"
  | "remix"
  | "immersive";

export type ShortsNavigationIntent =
  | "next"
  | "previous"
  | "open-context"
  | "close-context"
  | "stop"
  | "resume";

export type ShortsInputModality =
  | "touch"
  | "pointer"
  | "keyboard"
  | "screen-reader"
  | "gamepad"
  | "ar"
  | "vr";

export interface ShortsNavigationState {
  activeIndex: number;
  activeContext: ShortsContextSpace | null;
  stopped: boolean;
  inputModality: ShortsInputModality;
}

export interface ShortsNavigationConfig {
  itemCount: number;
  loop: boolean;
}

export interface ShortsNavigationAction {
  intent: ShortsNavigationIntent;
  context?: ShortsContextSpace;
  modality: ShortsInputModality;
}

export function createShortsNavigationState(
  config: ShortsNavigationConfig,
  modality: ShortsInputModality = "touch",
): ShortsNavigationState {
  return {
    activeIndex: config.itemCount > 0 ? 0 : -1,
    activeContext: null,
    stopped: false,
    inputModality: modality,
  };
}

export function reduceShortsNavigation(
  state: ShortsNavigationState,
  action: ShortsNavigationAction,
  config: ShortsNavigationConfig,
): ShortsNavigationState {
  if (action.intent === "open-context") {
    return {
      ...state,
      activeContext: action.context ?? null,
      inputModality: action.modality,
    };
  }

  if (action.intent === "close-context") {
    return { ...state, activeContext: null, inputModality: action.modality };
  }

  if (action.intent === "stop") {
    return { ...state, stopped: true, inputModality: action.modality };
  }

  if (action.intent === "resume") {
    return { ...state, stopped: false, inputModality: action.modality };
  }

  if (config.itemCount <= 0) {
    return { ...state, activeIndex: -1, inputModality: action.modality };
  }

  const delta = action.intent === "next" ? 1 : -1;
  let nextIndex = state.activeIndex + delta;

  if (config.loop) {
    nextIndex = (nextIndex + config.itemCount) % config.itemCount;
  } else {
    nextIndex = Math.max(0, Math.min(config.itemCount - 1, nextIndex));
  }

  return {
    ...state,
    activeIndex: nextIndex,
    activeContext: null,
    stopped: false,
    inputModality: action.modality,
  };
}

/**
 * Converts a horizontal gesture into a context action without coupling the
 * decision to React, DOM events, or a particular device.
 */
export function contextFromHorizontalSwipe(
  deltaX: number,
  threshold = 72,
): ShortsContextSpace | null {
  if (Math.abs(deltaX) < threshold) return null;
  return deltaX < 0 ? "related" : "creator";
}
