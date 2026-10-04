/**
 * Fresh Web Lite — Interaction State Contract
 * Every interactive primitive should implement these states consistently.
 */
export const FRESH_INTERACTION_STATES = [
  "default",
  "hover",
  "pressed",
  "focus-visible",
  "selected",
  "disabled",
  "loading",
  "success",
  "error",
] as const;

export type FreshInteractionState = typeof FRESH_INTERACTION_STATES[number];

export const FRESH_INTERACTION_RULES = {
  default: "Show the normal available action or content.",
  hover: "Provide a subtle visual response without changing meaning.",
  pressed: "Clearly acknowledge activation.",
  "focus-visible": "Keep keyboard or assistive focus visible and distinct.",
  selected: "Persistently communicate the current choice.",
  disabled: "Communicate unavailable state and prevent the action.",
  loading: "Preserve context while making progress explicit.",
  success: "Confirm completion without requiring interpretation from color alone.",
  error: "Explain the problem and, where possible, the next recovery action.",
} as const;
