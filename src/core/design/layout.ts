export const freshLayout = {
  maxContentWidth: "1200px",
  readableWidth: "720px",
  pageGutter: "clamp(16px, 4vw, 32px)",
  sectionGap: "clamp(24px, 5vw, 48px)",
  gridGap: "16px",
  navigationHeight: "64px",
  mobileNavigationHeight: "56px",
} as const;

export const freshResponsiveRules = [
  "Design mobile-first; enhance rather than fork the experience.",
  "Use vertical scrolling for primary content flows unless the task is inherently horizontal.",
  "Never hide essential actions solely because the viewport is small.",
  "Prefer fluid sizing before breakpoint-specific overrides.",
  "Adapt density, not meaning, across devices.",
] as const;
