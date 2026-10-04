/**
 * Fresh Web Lite — Semantic Design Tokens
 * Point 0: components consume roles, not raw colors.
 */
import type { FreshTheme } from "./designTokens";

export const freshSemanticColors = {
  light: {
    background: "#F7F8FA",
    surface: "#FFFFFF",
    surfaceSubtle: "#F1F3F5",
    surfaceElevated: "#FFFFFF",
    text: "#111318",
    textMuted: "#5F6673",
    textOnAccent: "#FFFFFF",
    border: "#D9DEE7",
    borderStrong: "#B8C0CC",
    accent: "#5B4CE6",
    accentHover: "#4D3ED1",
    accentPressed: "#4033B8",
    accentSubtle: "#EEEBFF",
    focus: "#5B4CE6",
    success: "#16834A",
    successSubtle: "#E8F6EE",
    warning: "#A86600",
    warningSubtle: "#FFF4DE",
    danger: "#C9364A",
    dangerSubtle: "#FDECEF",
    info: "#1769AA",
    infoSubtle: "#EAF3FB",
    disabled: "#9AA1AD",
  },
  dark: {
    background: "#080A0E",
    surface: "#11151B",
    surfaceSubtle: "#171C23",
    surfaceElevated: "#1B212A",
    text: "#F5F7FA",
    textMuted: "#AAB2BF",
    textOnAccent: "#FFFFFF",
    border: "#2A313B",
    borderStrong: "#3A4350",
    accent: "#8B7CFF",
    accentHover: "#9B8EFF",
    accentPressed: "#7969F0",
    accentSubtle: "#211D43",
    focus: "#A99DFF",
    success: "#43C983",
    successSubtle: "#123423",
    warning: "#F0B44D",
    warningSubtle: "#3A2B12",
    danger: "#FF7080",
    dangerSubtle: "#3D1820",
    info: "#67B4F4",
    infoSubtle: "#102A3D",
    disabled: "#69717D",
  },
} as const;

export type FreshSemanticColorRole = keyof typeof freshSemanticColors.light;

export type FreshSemanticColorSet = Record<FreshSemanticColorRole, string>;

export const freshThemeTokens: Record<Exclude<FreshTheme, "system">, FreshSemanticColorSet> = {
  light: freshSemanticColors.light,
  dark: freshSemanticColors.dark,
};

