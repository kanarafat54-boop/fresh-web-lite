/** Studio navigation (spec §4). */
export const STUDIO_SECTIONS = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "projects", label: "Projects", icon: "▤" },
  { id: "create", label: "Create", icon: "＋" },
  { id: "ai", label: "AI Creation", icon: "✦" },
  { id: "assets", label: "Assets", icon: "▦" },
  { id: "templates", label: "Templates", icon: "❏" },
  { id: "brand", label: "Brand Kit", icon: "◐" },
  { id: "publishing", label: "Publishing", icon: "↗" },
  { id: "analytics", label: "Analytics", icon: "▲" },
  { id: "team", label: "Team", icon: "☺" },
  { id: "settings", label: "Settings", icon: "⚙" },
] as const;

export type StudioSectionId = (typeof STUDIO_SECTIONS)[number]["id"];

/** Mobile bottom bar shows only these; everything else lives in the drawer (spec §4: must not overcrowd). */
export const MOBILE_PRIMARY_SECTIONS: readonly StudioSectionId[] = ["home", "projects", "create"];

export function isSectionId(value: string): value is StudioSectionId {
  return STUDIO_SECTIONS.some((s) => s.id === value);
}
