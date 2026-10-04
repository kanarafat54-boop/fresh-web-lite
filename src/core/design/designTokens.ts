/**
 * Fresh Web Lite — Canonical Design Tokens
 * Point 0: one visual language before ecosystem-specific styling.
 */
export const FRESH_DESIGN_VERSION = "0.2.0";
export const freshSpacing = {0:"0px",1:"2px",2:"4px",3:"6px",4:"8px",5:"10px",6:"12px",7:"14px",8:"16px",10:"20px",12:"24px",14:"28px",16:"32px",20:"40px",24:"48px",32:"64px"} as const;
export const freshRadius = {none:"0px",xs:"4px",sm:"8px",md:"12px",lg:"16px",xl:"20px",pill:"999px"} as const;
export const freshTypography = {body:{family:"Inter, system-ui, sans-serif",weight:400,lineHeight:1.5},label:{family:"Inter, system-ui, sans-serif",weight:600,lineHeight:1.25},heading:{family:"Sora, Inter, system-ui, sans-serif",weight:700,lineHeight:1.15}} as const;
export const freshTypeScale = {display:{size:"2.25rem",lineHeight:1.08,weight:700},title:{size:"1.5rem",lineHeight:1.15,weight:700},heading:{size:"1.25rem",lineHeight:1.2,weight:700},body:{size:"1rem",lineHeight:1.5,weight:400},bodySmall:{size:"0.875rem",lineHeight:1.45,weight:400},label:{size:"0.875rem",lineHeight:1.25,weight:600},caption:{size:"0.75rem",lineHeight:1.35,weight:500}} as const;
export const freshMotion = {fast:"120ms",normal:"180ms",deliberate:"280ms",easing:"cubic-bezier(0.2, 0, 0, 1)",reduced:"0ms"} as const;
export const freshIcon = {grid:24,stroke:1.75,sizes:{xs:16,sm:20,md:24,lg:32,xl:48}} as const;
export const freshBreakpoints = {phone:"0px",tablet:"760px",desktop:"1024px",wide:"1280px"} as const;
export const freshElevation = {none:"none",subtle:"0 1px 2px rgba(0,0,0,.08)",raised:"0 8px 24px rgba(0,0,0,.12)",overlay:"0 16px 48px rgba(0,0,0,.18)"} as const;
export const freshControl = {minTouchTarget:44,inputHeight:44,buttonHeight:44,compactHeight:36,iconButtonSize:44} as const;
export const freshZIndex = {base:0,sticky:20,navigation:40,overlay:60,dialog:80,toast:100} as const;
export type FreshTheme = "light" | "dark" | "system";
