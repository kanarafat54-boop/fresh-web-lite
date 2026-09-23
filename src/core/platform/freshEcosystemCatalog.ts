/**
 * Fresh Web Lite — canonical platform architecture.
 *
 * One platform, one shared foundation, many ecosystems.
 *
 * IMPORTANT:
 * - The 42 entries below are the current master "major ecosystem" catalog.
 * - Existing smaller/legacy ecosystem IDs are preserved as surfaces/capabilities
 *   and mapped to a major ecosystem instead of being deleted or duplicated.
 * - This registry is descriptive; an entry is not marked production-ready merely
 *   because it exists here. Runtime truth remains in featureWiringRegistry and
 *   production gates.
 */

export type EcosystemLifecycle = "planned" | "discovered" | "wired" | "verified" | "blocked";

export type PlatformSpace =
  | "social"
  | "intelligence"
  | "creator"
  | "business"
  | "finance"
  | "learning"
  | "developer"
  | "lifestyle"
  | "productivity"
  | "platform";

export type MajorEcosystem = {
  id: string;
  name: string;
  space: PlatformSpace;
  description: string;
  lifecycle: EcosystemLifecycle;
  childSurfaceIds: string[];
};

export type EcosystemSurface = {
  id: string;
  name: string;
  majorEcosystemId: string;
  kind: "ecosystem" | "capability" | "platform-surface";
  route?: string;
  description: string;
};

export const FRESH_MAJOR_ECOSYSTEMS: MajorEcosystem[] = [
  { id: "home-feed", name: "Home & Feed", space: "social", description: "The primary personal home, feed and discovery entry point.", lifecycle: "wired", childSurfaceIds: ["feed"] },
  { id: "fresh-ai", name: "Fresh AI", space: "intelligence", description: "Platform-wide intelligence, assistance, reasoning and agents.", lifecycle: "wired", childSurfaceIds: ["fresh-ai"] },
  { id: "ara6-core", name: "Ara6 Core", space: "developer", description: "Fresh's programmable language and engineering runtime.", lifecycle: "discovered", childSurfaceIds: ["ara6"] },
  { id: "fresh-id", name: "Fresh ID", space: "platform", description: "Portable identity, profile, permissions and personal context.", lifecycle: "wired", childSurfaceIds: ["fresh-id", "profile"] },
  { id: "messaging", name: "Messaging", space: "social", description: "Direct and private communication.", lifecycle: "wired", childSurfaceIds: ["communication", "messaging"] },
  { id: "communities", name: "Communities", space: "social", description: "Interest, professional and public community spaces.", lifecycle: "discovered", childSurfaceIds: ["communities"] },
  { id: "groups", name: "Groups", space: "social", description: "Private and public group collaboration.", lifecycle: "discovered", childSurfaceIds: ["groups"] },
  { id: "creator-studio", name: "Creator Studio", space: "creator", description: "Creation, publishing, remixing and creator operations.", lifecycle: "wired", childSurfaceIds: ["creator", "studio", "creator-economy"] },
  { id: "shorts", name: "Shorts", space: "creator", description: "Short-form vertical media and its interaction system.", lifecycle: "wired", childSurfaceIds: ["shorts"] },
  { id: "video-platform", name: "Video Platform", space: "creator", description: "Long-form and general video publishing and viewing.", lifecycle: "planned", childSurfaceIds: ["video-platform", "fresh-flow"] },
  { id: "live-platform", name: "Live Platform", space: "creator", description: "Live video, audio, interaction and creator monetization.", lifecycle: "discovered", childSurfaceIds: ["live"] },
  { id: "stories", name: "Stories", space: "social", description: "Temporary visual and audio publishing.", lifecycle: "discovered", childSurfaceIds: ["stories"] },
  { id: "news", name: "News", space: "social", description: "News and durable posts within Fresh Flow.", lifecycle: "wired", childSurfaceIds: ["news", "fresh-flow"] },
  { id: "universal-search", name: "Universal Search", space: "platform", description: "Search across information, people, media, knowledge, services and actions.", lifecycle: "wired", childSurfaceIds: ["search"] },
  { id: "learning", name: "Learning", space: "learning", description: "Courses, skills, research and learning workflows.", lifecycle: "discovered", childSurfaceIds: ["academy", "learning"] },
  { id: "developer-studio", name: "Developer Studio", space: "developer", description: "Developer tools and application-building workflows.", lifecycle: "discovered", childSurfaceIds: ["software", "developer-studio"] },
  { id: "design-studio", name: "Design Studio", space: "creator", description: "Design and visual creation workflows.", lifecycle: "planned", childSurfaceIds: ["design-studio"] },
  { id: "automation-center", name: "Automation Center", space: "intelligence", description: "Agents, workflows, scheduled actions and automation.", lifecycle: "discovered", childSurfaceIds: ["automation"] },
  { id: "memory-center", name: "Memory Center", space: "intelligence", description: "User-controlled memory and cross-ecosystem context.", lifecycle: "discovered", childSurfaceIds: ["memory"] },
  { id: "cloud-files", name: "Cloud & Files", space: "productivity", description: "Files, documents and cloud workspace capabilities.", lifecycle: "planned", childSurfaceIds: ["cloud-files"] },
  { id: "calendar-events", name: "Calendar & Events", space: "productivity", description: "Scheduling, events and time-based coordination.", lifecycle: "planned", childSurfaceIds: ["calendar-events"] },
  { id: "tasks-productivity", name: "Tasks & Productivity", space: "productivity", description: "Tasks, projects and personal productivity.", lifecycle: "planned", childSurfaceIds: ["work"] },
  { id: "business-hub", name: "Business Hub", space: "business", description: "Business operations, organizations and professional workflows.", lifecycle: "discovered", childSurfaceIds: ["organizations", "business"] },
  { id: "marketplace", name: "Marketplace", space: "business", description: "Services, goods and digital marketplace transactions.", lifecycle: "discovered", childSurfaceIds: ["marketplace"] },
  { id: "fresh-wallet", name: "Fresh Wallet", space: "finance", description: "User-controlled wallet and platform payments.", lifecycle: "wired", childSurfaceIds: ["wallet"] },
  { id: "fresh-currency", name: "Fresh Currency", space: "finance", description: "Platform economic unit and value transfer layer.", lifecycle: "discovered", childSurfaceIds: ["wallet", "fresh-currency"] },
  { id: "investment-center", name: "Investment Center", space: "finance", description: "Future investment and wealth-management capabilities.", lifecycle: "planned", childSurfaceIds: ["investment-center"] },
  { id: "shopping", name: "Shopping", space: "lifestyle", description: "Product discovery and shopping workflows.", lifecycle: "planned", childSurfaceIds: ["shopping"] },
  { id: "delivery-logistics", name: "Delivery & Logistics", space: "lifestyle", description: "Delivery, movement and logistics coordination.", lifecycle: "planned", childSurfaceIds: ["delivery-logistics"] },
  { id: "jobs-careers", name: "Jobs & Careers", space: "business", description: "Professional opportunities, hiring and career workflows.", lifecycle: "planned", childSurfaceIds: ["jobs-careers"] },
  { id: "music", name: "Music", space: "creator", description: "Music creation, publishing and discovery.", lifecycle: "planned", childSurfaceIds: ["music"] },
  { id: "gaming", name: "Gaming", space: "lifestyle", description: "Gaming discovery, community and future interactive experiences.", lifecycle: "planned", childSurfaceIds: ["gaming"] },
  { id: "sports", name: "Sports", space: "lifestyle", description: "Sports discovery, communities and live experiences.", lifecycle: "discovered", childSurfaceIds: ["sports"] },
  { id: "travel", name: "Travel", space: "lifestyle", description: "Travel discovery, planning and experiences.", lifecycle: "planned", childSurfaceIds: ["travel"] },
  { id: "food", name: "Food", space: "lifestyle", description: "Food discovery, experiences and commerce.", lifecycle: "planned", childSurfaceIds: ["food"] },
  { id: "health", name: "Health", space: "lifestyle", description: "Health information and future connected services.", lifecycle: "planned", childSurfaceIds: ["health"] },
  { id: "governance", name: "Governance", space: "platform", description: "Human-centered governance, appeals, oversight and platform policy.", lifecycle: "planned", childSurfaceIds: ["governance"] },
  { id: "security-center", name: "Security Center", space: "platform", description: "Security, privacy, sessions, audit and protection.", lifecycle: "wired", childSurfaceIds: ["security"] },
  { id: "analytics-center", name: "Analytics Center", space: "business", description: "Transparent analytics for creators, businesses and the platform.", lifecycle: "discovered", childSurfaceIds: ["analytics"] },
  { id: "monetization-center", name: "Monetization Center", space: "business", description: "Creator, business and platform monetization controls.", lifecycle: "discovered", childSurfaceIds: ["monetization", "creator-economy"] },
  { id: "api-integrations", name: "API & Integrations", space: "developer", description: "APIs, integrations, extensions and interoperability.", lifecycle: "discovered", childSurfaceIds: ["api-hub"] },
  { id: "innovation-lab", name: "Innovation Lab", space: "platform", description: "Future technologies and controlled experimentation.", lifecycle: "planned", childSurfaceIds: ["innovation-lab", "vr-ar"] },
];

export const FRESH_ECOSYSTEM_SURFACES: EcosystemSurface[] = [
  { id: "feed", name: "Feed", majorEcosystemId: "home-feed", kind: "ecosystem", route: "/", description: "Personal home and feed." },
  { id: "fresh-flow", name: "Fresh Flow", majorEcosystemId: "video-platform", kind: "platform-surface", route: "/fresh-flow", description: "Universal media and information layer." },
  { id: "fresh-ai", name: "Fresh AI", majorEcosystemId: "fresh-ai", kind: "ecosystem", route: "/ai", description: "Platform intelligence." },
  { id: "fresh-id", name: "Fresh ID", majorEcosystemId: "fresh-id", kind: "ecosystem", route: "/profile", description: "Identity and profile." },
  { id: "profile", name: "Profile", majorEcosystemId: "fresh-id", kind: "platform-surface", route: "/profile", description: "Universal profile surface." },
  { id: "communication", name: "Communication", majorEcosystemId: "messaging", kind: "ecosystem", route: "/connect", description: "Communication workspace." },
  { id: "messaging", name: "Messaging", majorEcosystemId: "messaging", kind: "ecosystem", route: "/connect", description: "Direct communication." },
  { id: "communities", name: "Communities", majorEcosystemId: "communities", kind: "ecosystem", route: "/communities", description: "Community workspace." },
  { id: "groups", name: "Groups", majorEcosystemId: "groups", kind: "ecosystem", route: "/groups", description: "Group workspace." },
  { id: "creator", name: "Creator", majorEcosystemId: "creator-studio", kind: "ecosystem", route: "/creator", description: "Creator studio." },
  { id: "studio", name: "Studio", majorEcosystemId: "creator-studio", kind: "ecosystem", route: "/studio", description: "General studio workspace." },
  { id: "shorts", name: "Shorts", majorEcosystemId: "shorts", kind: "ecosystem", route: "/fresh-flow", description: "Short-form media." },
  { id: "live", name: "Live", majorEcosystemId: "live-platform", kind: "ecosystem", route: "/live", description: "Live media." },
  { id: "stories", name: "Stories", majorEcosystemId: "stories", kind: "ecosystem", route: "/stories", description: "Stories." },
  { id: "news", name: "News / Posts", majorEcosystemId: "news", kind: "ecosystem", route: "/fresh-flow", description: "News and posts." },
  { id: "search", name: "Universal Search", majorEcosystemId: "universal-search", kind: "ecosystem", route: "/search", description: "Universal search." },
  { id: "academy", name: "Academy", majorEcosystemId: "learning", kind: "ecosystem", route: "/learn", description: "Learning and skills." },
  { id: "learning", name: "Learning", majorEcosystemId: "learning", kind: "ecosystem", route: "/learn", description: "Learning workspace." },
  { id: "software", name: "Software Studio", majorEcosystemId: "developer-studio", kind: "ecosystem", route: "/software", description: "Software development." },
  { id: "ara6", name: "Ara6", majorEcosystemId: "ara6-core", kind: "ecosystem", description: "Ara6 runtime." },
  { id: "automation", name: "Automation", majorEcosystemId: "automation-center", kind: "ecosystem", route: "/automation", description: "Automation workspace." },
  { id: "work", name: "Work", majorEcosystemId: "tasks-productivity", kind: "ecosystem", route: "/work", description: "Work and productivity." },
  { id: "organizations", name: "Organizations", majorEcosystemId: "business-hub", kind: "ecosystem", route: "/organizations", description: "Organization workspaces." },
  { id: "marketplace", name: "Marketplace", majorEcosystemId: "marketplace", kind: "ecosystem", route: "/marketplace", description: "Marketplace." },
  { id: "wallet", name: "Wallet", majorEcosystemId: "fresh-wallet", kind: "ecosystem", route: "/wallet", description: "Fresh Wallet." },
  { id: "treasure", name: "Fresh Treasure", majorEcosystemId: "fresh-wallet", kind: "ecosystem", route: "/treasure", description: "Savings, rewards and wealth surface." },
  { id: "crypto", name: "Fresh Crypto", majorEcosystemId: "fresh-currency", kind: "ecosystem", route: "/crypto", description: "Crypto and digital value surface." },
  { id: "ads-campaigns", name: "Ads & Campaigns", majorEcosystemId: "monetization-center", kind: "ecosystem", route: "/ads-campaigns", description: "Advertising and campaigns." },
  { id: "trust", name: "Trust", majorEcosystemId: "security-center", kind: "platform-surface", route: "/trust", description: "Trust and reputation." },
  { id: "vr-ar", name: "VR / AR", majorEcosystemId: "innovation-lab", kind: "ecosystem", route: "/vr-ar", description: "Immersive media." },
  { id: "language", name: "Language", majorEcosystemId: "universal-search", kind: "platform-surface", route: "/language", description: "Translation and multilingual interaction." },
  { id: "api-hub", name: "API Hub", majorEcosystemId: "api-integrations", kind: "ecosystem", route: "/api-hub", description: "Platform APIs and integrations." },
  { id: "sports", name: "Sports", majorEcosystemId: "sports", kind: "ecosystem", route: "/sports", description: "Sports experiences." },
  { id: "calls", name: "Calls", majorEcosystemId: "messaging", kind: "ecosystem", route: "/calls", description: "Voice and video calls." },
  { id: "comments", name: "Comments", majorEcosystemId: "messaging", kind: "capability", description: "Conversation attached to content." },
  { id: "reactions", name: "Reactions", majorEcosystemId: "messaging", kind: "capability", description: "Universal reactions." },
  { id: "universal-interactions", name: "Universal Interactions", majorEcosystemId: "messaging", kind: "platform-surface", description: "Canonical interaction persistence." },
  { id: "notifications", name: "Notifications", majorEcosystemId: "home-feed", kind: "platform-surface", description: "Cross-platform notification system." },
  { id: "moderation", name: "Moderation", majorEcosystemId: "security-center", kind: "platform-surface", description: "Safety and moderation." },
  { id: "analytics", name: "Analytics", majorEcosystemId: "analytics-center", kind: "ecosystem", description: "Analytics infrastructure." },
  { id: "accessibility", name: "Accessibility", majorEcosystemId: "governance", kind: "platform-surface", description: "Accessibility capabilities." },
  { id: "memory", name: "Memory", majorEcosystemId: "memory-center", kind: "platform-surface", description: "User-controlled memory." },
];

export function getMajorEcosystem(id: string): MajorEcosystem | undefined {
  return FRESH_MAJOR_ECOSYSTEMS.find((ecosystem) => ecosystem.id === id);
}

export function getEcosystemSurface(id: string): EcosystemSurface | undefined {
  return FRESH_ECOSYSTEM_SURFACES.find((surface) => surface.id === id);
}

export function getSurfacesForEcosystem(id: string): EcosystemSurface[] {
  return FRESH_ECOSYSTEM_SURFACES.filter((surface) => surface.majorEcosystemId === id);
}

export function getEcosystemCatalog(): MajorEcosystem[] {
  return [...FRESH_MAJOR_ECOSYSTEMS];
}
