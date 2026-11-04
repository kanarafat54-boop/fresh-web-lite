/**
 * Single source of truth for Fresh navigation.
 *
 * Features that serve the same purpose are grouped together, and every
 * registered workspace is reachable from here on desktop (sidebar) and on
 * mobile (bottom bar + "More" sheet). Labels are the one name used everywhere.
 */

export type NavItem = {
  /** Route id understood by LayoutProvider / FeatureRegistry. */
  id: string;
  label: string;
  /** One short line explaining what the destination is for. */
  hint: string;
  icon: string;
  /** Other route ids that should also light this item up. */
  aliases?: string[];
  /** Route ids starting with this prefix also light this item up. */
  prefix?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    items: [
      { id: "feed", label: "Home", hint: "Your overview and feed", icon: "⌂" },
      { id: "fresh-flow", label: "Flow", hint: "Shorts, videos, news and more", icon: "✦", prefix: "fresh-flow" },
      { id: "saved", label: "Saved", hint: "Things you kept for later", icon: "◷" },
    ],
  },
  {
    id: "create",
    label: "Create & work",
    items: [
      { id: "studio", label: "Create", hint: "Publish shorts, posts and drafts", icon: "＋" },
      { id: "creator", label: "Creator dashboard", hint: "Your content and audience", icon: "◈" },
      { id: "work", label: "Work", hint: "Projects, tasks and business", icon: "▦" },
    ],
  },
  {
    id: "connect",
    label: "Connect & trade",
    items: [
      { id: "communication", label: "Connect", hint: "Messages and connections", icon: "◌" },
      { id: "marketplace", label: "Marketplace", hint: "Buy, sell and trade", icon: "◇" },
    ],
  },
  {
    id: "learn",
    label: "Learn & discover",
    items: [
      { id: "learning", label: "Academy", hint: "Courses and learning", icon: "◎" },
      { id: "discovery", label: "Discover", hint: "Search and explore Fresh", icon: "⌕" },
      { id: "ai", label: "Fresh AI", hint: "Your personal AI workspace", icon: "✧" },
    ],
  },
  {
    id: "money",
    label: "Money",
    items: [
      { id: "wallet", label: "Wallet", hint: "Balances and payments", icon: "▣" },
      { id: "crypto", label: "Crypto", hint: "On-chain assets", icon: "◐" },
    ],
  },
];

export const ACCOUNT_ITEMS: NavItem[] = [
  { id: "profile", label: "Profile", hint: "Your Fresh ID and public page", icon: "☺" },
  { id: "settings", label: "Settings", hint: "Account and preferences", icon: "⚙" },
];

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((group) => group.items), ...ACCOUNT_ITEMS];

/** Route ids shown directly in the mobile bar; everything else lives under "More". */
export const MOBILE_PRIMARY_IDS = ["feed", "fresh-flow", "studio", "ai"] as const;

export function isNavItemActive(item: NavItem, activeRoute?: string): boolean {
  const route = activeRoute ?? "";
  if (item.id === "feed") return route === "feed" || route === "";
  if (route === item.id) return true;
  if (item.aliases?.includes(route)) return true;
  if (item.prefix && route.startsWith(item.prefix)) return true;
  return false;
}

/** The "creator" dashboard is part of the Create group for the mobile bar highlight. */
export function isMobilePrimaryRoute(activeRoute?: string): boolean {
  const route = activeRoute ?? "";
  return ALL_NAV_ITEMS.filter((item) => (MOBILE_PRIMARY_IDS as readonly string[]).includes(item.id)).some((item) => isNavItemActive(item, route));
}
