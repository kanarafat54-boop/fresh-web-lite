/** Studio navigation (spec §4). */
export const STUDIO_SECTIONS = [
  { id: "home", label: "Dashboard", icon: "⌂", ready: true },
  { id: "projects", label: "Content", icon: "▤", ready: true },
  { id: "create", label: "Create", icon: "＋", ready: true },
  { id: "publish", label: "Publish", icon: "↗", ready: true },
  { id: "analytics", label: "Analytics", icon: "▲", ready: true },
  { id: "audio", label: "Audio", icon: "♪", ready: true },
  { id: "design", label: "Design", icon: "✎", ready: true },
  { id: "distribute", label: "Distribute", icon: "⇄", ready: true },
  { id: "earn", label: "Earn", icon: "◈", ready: true },
  { id: "settings", label: "Settings", icon: "⚙", ready: true },
  { id: "ai", label: "AI Creation", icon: "✦", ready: false },
  { id: "assets", label: "Assets", icon: "▦", ready: false },
  { id: "templates", label: "Templates", icon: "❏", ready: false },
  { id: "brand", label: "Brand Kit", icon: "◐", ready: false },
  { id: "team", label: "Team", icon: "☺", ready: false },
] as const;

/** Sections that show a page of the Creator dashboard inside Studio (the same publisher, analytics and tools as before). */
export const CREATOR_TAB_SECTIONS = { publish: "publish", analytics: "analytics", audio: "audio", design: "design", distribute: "distribute", earn: "monetize" } as const;
export type CreatorTabSection = keyof typeof CREATOR_TAB_SECTIONS;

export type StudioSectionId = (typeof STUDIO_SECTIONS)[number]["id"];

/** Mobile bottom bar shows only these; everything else lives in the drawer (spec §4: must not overcrowd). */
export const MOBILE_PRIMARY_SECTIONS: readonly StudioSectionId[] = ["home", "create", "projects"];

/** Sections that do real work today. The rest sit under "Coming soon" so the menu is not a wall of dead ends (spec §28). */
export const READY_SECTIONS = STUDIO_SECTIONS.filter((s) => s.ready);
export const COMING_SOON_SECTIONS = STUDIO_SECTIONS.filter((s) => !s.ready);

/** Only video has an editor inside Studio so far; other kinds create planning projects. */
export const KINDS_WITH_EDITOR: readonly string[] = ["video"];
export const hasStudioEditor = (kind: string) => KINDS_WITH_EDITOR.includes(kind);

export function isSectionId(value: string): value is StudioSectionId {
  return STUDIO_SECTIONS.some((s) => s.id === value);
}
