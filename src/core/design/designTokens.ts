/**
 * Fresh Web Lite — Canonical Design Tokens
 * Point 0: one visual language before ecosystem-specific styling.
 */
export const FRESH_DESIGN_VERSION = "0.1.0";

export const freshSpacing = {
  0:"0px",1:"2px",2:"4px",3:"6px",4:"8px",5:"10px",6:"12px",7:"14px",
  8:"16px",10:"20px",12:"24px",14:"28px",16:"32px",20:"40px",24:"48px",
} as const;

export const freshRadius = {
  none:"0px",xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"20px",pill:"999px",
} as const;

export const freshTypography = {
  body:{family:"Inter, system-ui, sans-serif",weight:400,lineHeight:1.5},
  label:{family:"Inter, system-ui, sans-serif",weight:600,lineHeight:1.25},
  heading:{family:"Sora, Inter, system-ui, sans-serif",weight:700,lineHeight:1.15},
} as const;

export const freshMotion = {
  fast:"120ms",normal:"180ms",deliberate:"280ms",
  easing:"cubic-bezier(0.2, 0, 0, 1)",reduced:"0ms",
} as const;

export const freshIcon = {
  grid:24,stroke:1.75,sizes:{xs:16,sm:20,md:24,lg:32,xl:48},
} as const;

export const freshBreakpoints = {
  phone:"0px",tablet:"760px",desktop:"1024px",wide:"1280px",
} as const;

export type FreshTheme = "light" | "dark" | "system";
