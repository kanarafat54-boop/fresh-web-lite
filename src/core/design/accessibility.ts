export const FRESH_ACCESSIBILITY_CONTRACT = {
  touchTarget: "44px minimum for interactive controls",
  focus: "Every keyboard-operable control has a visible focus-visible state",
  color: "Never communicate essential meaning by color alone",
  labels: "Icon-only controls expose an accessible name",
  motion: "Respect prefers-reduced-motion",
  semantics: "Use native HTML semantics before ARIA",
  contrast: "Text and controls must remain perceivable against their surfaces",
  errors: "Errors explain the problem and the recovery path when possible",
  language: "Content and controls must remain understandable when localized",
} as const;

export const FRESH_INPUT_METHODS = ["touch", "pointer", "keyboard", "voice", "camera", "assistive"] as const;
