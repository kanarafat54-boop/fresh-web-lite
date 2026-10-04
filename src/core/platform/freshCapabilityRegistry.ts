/**
 * Fresh Web Lite — canonical capability universe.
 *
 * Architecture:
 * Capability Universe → Capability Families → Ecosystems → Surfaces → Features
 *
 * This registry is deliberately broader than the current UI. It records:
 * - capabilities that exist today
 * - the problem Fresh intends to solve better
 * - the 10× direction
 * - future/invented capability space
 * - one canonical owner with many consumers
 *
 * Runtime readiness is tracked elsewhere. Registering a capability does not
 * claim that it is production-ready.
 */

export type CapabilityLifecycle = "discovered" | "planned" | "wired" | "verified" | "blocked";

export type CapabilityFamily =
  | "experience"
  | "identity-trust"
  | "intelligence"
  | "communication"
  | "media"
  | "communities"
  | "creation"
  | "discovery"
  | "learning"
  | "work"
  | "opportunity"
  | "commerce"
  | "finance"
  | "crypto"
  | "personal-life"
  | "business"
  | "software"
  | "developer"
  | "platform";

export type CapabilityDefinition = {
  id: string;
  name: string;
  family: CapabilityFamily;
  canonicalEcosystem: string;
  description: string;
  existing: string[];
  problems: string[];
  fresh10x: string[];
  future: string[];
  consumers: string[];
  lifecycle: CapabilityLifecycle;
  requiresHumanApproval?: boolean;
};

const capability = (
  value: Omit<CapabilityDefinition, "lifecycle"> & { lifecycle?: CapabilityLifecycle },
): CapabilityDefinition => ({
  lifecycle: "planned",
  ...value,
});

/**
 * The first implementation slice is Fresh Flow, but its capabilities are
 * registered against the same universal ownership model used by every future
 * ecosystem.
 */
export const FRESH_CAPABILITIES: CapabilityDefinition[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // SHARED EXPERIENCE
  // ──────────────────────────────────────────────────────────────────────────
  capability({
    id: "intent-entry",
    name: "Universal Intent Entry",
    family: "experience",
    canonicalEcosystem: "fresh-core",
    description: "One place to express an outcome by text, voice, camera or other supported input.",
    existing: ["search boxes", "chat assistants", "voice assistants"],
    problems: ["Users must know which app or feature to open.", "Intent gets fragmented across products."],
    fresh10x: ["Route intent to the right capability automatically.", "Preserve context across the resulting workflow."],
    future: ["Outcome-first computing where the interface is generated around the user's goal."],
    consumers: ["flow", "connect", "discover", "studio", "academy", "work", "market", "wallet"],
    lifecycle: "wired",
  }),
  capability({
    id: "adaptive-representation",
    name: "Adaptive Representation",
    family: "experience",
    canonicalEcosystem: "fresh-core",
    description: "Represent the same meaning in the form best suited to the user, device and context.",
    existing: ["captions", "screen readers", "translation", "responsive UI"],
    problems: ["Accessibility is often bolted on.", "One representation does not fit every user."],
    fresh10x: ["Adapt representation without changing the underlying meaning.", "Respect user-selected accessibility preferences."],
    future: ["Real-time multimodal representation switching based on context and permission."],
    consumers: ["flow", "connect", "academy", "work", "discover", "life"],
    lifecycle: "planned",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // FRESH FLOW
  // ──────────────────────────────────────────────────────────────────────────
  capability({
    id: "flow-short-video",
    name: "Short-form Vertical Media",
    family: "media",
    canonicalEcosystem: "fresh-flow",
    description: "Vertical short-form video with interaction, discovery and intelligence.",
    existing: ["short-form video feeds"],
    problems: ["Feeds optimize for engagement rather than usefulness.", "Context and accessibility are often fragmented."],
    fresh10x: ["Understandable media.", "Context-aware discovery.", "AI interpretation, translation and action from the media itself."],
    future: ["Interactive media that behaves like a living knowledge/action surface."],
    consumers: ["flow", "discover", "studio", "academy", "opportunity"],
    lifecycle: "wired",
  }),
  capability({
    id: "flow-long-video",
    name: "Long-form Video",
    family: "media",
    canonicalEcosystem: "fresh-flow",
    description: "Long-form video publishing, viewing and intelligent navigation.",
    existing: ["video platforms", "course video"],
    problems: ["Finding the useful section is slow.", "Knowledge remains trapped inside the video."],
    fresh10x: ["Ask the video.", "Generate chapters, summaries and accessible representations.", "Jump directly to relevant evidence."],
    future: ["Videos that expose structured knowledge, actions and related opportunities as native layers."],
    consumers: ["flow", "academy", "discover", "studio"],
    lifecycle: "planned",
  }),
  capability({
    id: "flow-live-media",
    name: "Live Media",
    family: "media",
    canonicalEcosystem: "fresh-flow",
    description: "Live video/audio experiences with real-time intelligence and interaction.",
    existing: ["live streaming", "live chat"],
    problems: ["Live information disappears quickly.", "Accessibility and translation lag behind the stream."],
    fresh10x: ["Real-time captions, translation and summaries.", "Persistent knowledge from important live moments."],
    future: ["Live experiences where viewers can ask, transact, learn and act without leaving the stream."],
    consumers: ["flow", "connect", "market", "wallet", "academy"],
    lifecycle: "planned",
  }),
  capability({
    id: "flow-stories",
    name: "Stories",
    family: "media",
    canonicalEcosystem: "fresh-flow",
    description: "Temporary visual/audio publishing with intelligent context.",
    existing: ["stories"],
    problems: ["Ephemeral content is hard to organize and reuse meaningfully."],
    fresh10x: ["User-controlled persistence.", "Automatic accessibility and translation.", "Context-aware follow-up actions."],
    future: ["Stories that become reusable memories, knowledge or workflows when the user chooses."],
    consumers: ["flow", "life", "connect"],
    lifecycle: "planned",
  }),
  capability({
    id: "flow-posts",
    name: "Posts and News",
    family: "media",
    canonicalEcosystem: "fresh-flow",
    description: "Text, image and mixed-media publishing for durable information and discussion.",
    existing: ["social posts", "news feeds", "microblogging"],
    problems: ["Facts, opinions, context and discussion are often mixed together."],
    fresh10x: ["Source-aware context.", "AI summaries and translation.", "Structured discussion and follow-up actions."],
    future: ["Posts that expose their knowledge graph and useful actions without becoming cluttered."],
    consumers: ["flow", "discover", "connect"],
    lifecycle: "wired",
  }),
  capability({
    id: "flow-podcasts-audio",
    name: "Podcasts and Audio",
    family: "media",
    canonicalEcosystem: "fresh-flow",
    description: "Audio discovery, publishing and intelligent interaction.",
    existing: ["podcast platforms", "audio feeds"],
    problems: ["Useful information is difficult to retrieve from long audio."],
    fresh10x: ["Searchable transcripts.", "Ask-the-episode.", "Chapters, summaries and translation."],
    future: ["Audio that dynamically becomes a lesson, briefing, discussion or action plan."],
    consumers: ["flow", "academy", "discover"],
    lifecycle: "planned",
  }),
  capability({
    id: "flow-interactive-media",
    name: "Interactive Media",
    family: "media",
    canonicalEcosystem: "fresh-flow",
    description: "Media that can be explored, questioned and acted upon rather than only consumed.",
    existing: ["interactive video", "AR/VR experiences"],
    problems: ["Most media remains passive."],
    fresh10x: ["Meaning, context and actions are native to the media surface."],
    future: ["Persistent interactive media objects and media-to-workflow experiences."],
    consumers: ["flow", "discover", "academy", "market", "opportunity"],
    lifecycle: "planned",
  }),
  capability({
    id: "flow-social-interactions",
    name: "Content Interactions",
    family: "communities",
    canonicalEcosystem: "fresh-flow",
    description: "Reactions, comments, replies, mentions, sharing and saves attached to content.",
    existing: ["social reactions", "comments", "sharing"],
    problems: ["Interaction is often shallow or engagement-optimized."],
    fresh10x: ["Useful conversation tools.", "Context-aware replies.", "User-controlled interaction signals."],
    future: ["AI-assisted discussion that improves understanding without impersonating the user."],
    consumers: ["flow", "connect", "communities"],
    lifecycle: "wired",
  }),
  capability({
    id: "flow-communities",
    name: "Media Communities",
    family: "communities",
    canonicalEcosystem: "fresh-flow",
    description: "Public, private and invite-only communities connected to media and topics.",
    existing: ["groups", "channels", "forums", "communities"],
    problems: ["Community context is fragmented across platforms."],
    fresh10x: ["Topic-aware organization.", "Roles and moderation.", "Knowledge and action layers connected to discussion."],
    future: ["Communities that become shared knowledge, learning and project spaces when members choose."],
    consumers: ["flow", "connect", "academy", "work"],
    lifecycle: "planned",
  }),
  capability({
    id: "flow-creator-memberships",
    name: "Creator Memberships and Support",
    family: "commerce",
    canonicalEcosystem: "fresh-flow",
    description: "Subscriptions, memberships, exclusive content, tips and creator support.",
    existing: ["creator memberships", "subscription platforms", "tips"],
    problems: ["Creator monetization is fragmented.", "Payment, content and audience management are separated."],
    fresh10x: ["Unified creator relationship.", "Transparent monetization.", "Wallet-native payouts and permissions."],
    future: ["Goal-based creator support where supporters can fund specific projects or outcomes."],
    consumers: ["flow", "creator", "market", "wallet"],
    lifecycle: "wired",
  }),
  capability({
    id: "flow-intelligence-layer",
    name: "Flow Intelligence Layer",
    family: "intelligence",
    canonicalEcosystem: "fresh-intelligence",
    description: "AI capabilities attached contextually to media and discussion.",
    existing: ["AI summaries", "translation", "captions", "recommendations"],
    problems: ["AI is often separated from the content being understood."],
    fresh10x: ["Understand, ask, translate, explore, save, learn, create and act directly from content."],
    future: ["Content becomes an intelligent gateway into the wider Fresh capability universe."],
    consumers: ["flow", "discover", "academy", "opportunity", "studio", "market"],
    lifecycle: "planned",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // DISCOVERY / KNOWLEDGE
  // ──────────────────────────────────────────────────────────────────────────
  capability({
    id: "universal-search",
    name: "Universal Search",
    family: "discovery",
    canonicalEcosystem: "fresh-discover",
    description: "Find information, people, media, products, services, opportunities and actions.",
    existing: ["web search", "site search", "AI search"],
    problems: ["Search returns information without helping complete the goal."],
    fresh10x: ["Search → understand → compare → decide → act."],
    future: ["Goal-aware discovery that resolves multi-step outcomes across ecosystems."],
    consumers: ["all"],
    lifecycle: "wired",
  }),
  capability({
    id: "deep-research",
    name: "Deep Research",
    family: "discovery",
    canonicalEcosystem: "fresh-discover",
    description: "Evidence-based research across sources and Fresh knowledge.",
    existing: ["research tools", "search engines"],
    problems: ["Users must manually assemble evidence and conclusions."],
    fresh10x: ["Evidence trails.", "Source comparison.", "Structured conclusions.", "Actionable next steps."],
    future: ["Persistent research worlds connected to goals, memory and execution."],
    consumers: ["discover", "academy", "work", "business", "opportunity"],
    lifecycle: "planned",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // CREATION
  // ──────────────────────────────────────────────────────────────────────────
  capability({
    id: "universal-creation",
    name: "Universal Creation",
    family: "creation",
    canonicalEcosystem: "fresh-studio",
    description: "Create text, images, video, audio, documents, presentations, websites and other media.",
    existing: ["creative suites", "AI generators"],
    problems: ["Creation tools are fragmented by media type."],
    fresh10x: ["One intent can produce coordinated multi-format outputs.", "Creation remains editable and attributable."],
    future: ["Intent-to-production pipelines spanning media, software and real-world actions."],
    consumers: ["flow", "studio", "work", "academy", "business"],
    lifecycle: "planned",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // COMMERCE / FINANCE
  // ──────────────────────────────────────────────────────────────────────────
  capability({
    id: "market-commerce",
    name: "Commerce",
    family: "commerce",
    canonicalEcosystem: "fresh-market",
    description: "Buy, sell, discover and transact for goods and services.",
    existing: ["marketplaces", "online stores", "service marketplaces"],
    problems: ["Discovery, trust, payment and fulfillment are fragmented."],
    fresh10x: ["Goal-aware shopping.", "Trust-aware matching.", "Wallet-native checkout.", "Post-purchase intelligence."],
    future: ["Agents that can coordinate authorized commerce end-to-end while preserving human control."],
    consumers: ["market", "flow", "work", "business", "opportunity"],
    lifecycle: "planned",
  }),
  capability({
    id: "wallet-payments",
    name: "Payments and Value Transfer",
    family: "finance",
    canonicalEcosystem: "fresh-wallet",
    description: "Send, receive, hold and authorize value transfers.",
    existing: ["digital wallets", "payment processors", "mobile money"],
    problems: ["Payment experiences are fragmented across services."],
    fresh10x: ["Unified authorization.", "Clear transaction context.", "Auditability.", "Cross-ecosystem settlement."],
    future: ["Intent-authorized payments where Fresh prepares but consequential transfers require explicit authority."],
    consumers: ["market", "flow", "work", "creator", "business"],
    lifecycle: "wired",
    requiresHumanApproval: true,
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // WORK / OPPORTUNITY / BUSINESS
  // ──────────────────────────────────────────────────────────────────────────
  capability({
    id: "work-execution",
    name: "Work Execution",
    family: "work",
    canonicalEcosystem: "fresh-work",
    description: "Tasks, projects, collaboration, workflows and professional execution.",
    existing: ["project management", "productivity suites", "freelance platforms"],
    problems: ["Planning and execution are separated from research and communication."],
    fresh10x: ["Goal → plan → tasks → agents → review → result."],
    future: ["Persistent AI workspaces that coordinate people, tools and agents under explicit authority."],
    consumers: ["work", "business", "studio", "opportunity"],
    lifecycle: "planned",
  }),
  capability({
    id: "opportunity-matching",
    name: "Opportunity Matching",
    family: "opportunity",
    canonicalEcosystem: "fresh-opportunity",
    description: "Find jobs, contracts, grants, partnerships, learning and business opportunities.",
    existing: ["job boards", "freelance platforms", "scholarship directories"],
    problems: ["Users search listings instead of matching opportunities to goals."],
    fresh10x: ["Goal-aware matching.", "Skill-gap detection.", "Preparation and application workflows."],
    future: ["Opportunity graphs that identify paths not yet obvious to the user."],
    consumers: ["opportunity", "work", "academy", "business", "life"],
    lifecycle: "planned",
  }),
  capability({
    id: "business-operations",
    name: "Business Operations",
    family: "business",
    canonicalEcosystem: "fresh-business",
    description: "Run organizations, customers, sales, operations and business intelligence.",
    existing: ["CRM", "ERP", "business suites"],
    problems: ["Business data and actions are fragmented across tools."],
    fresh10x: ["One business context.", "AI operational intelligence.", "Connected sales, finance and execution."],
    future: ["Permissioned AI operating teams that coordinate routine business operations."],
    consumers: ["business", "market", "work", "wallet", "opportunity"],
    lifecycle: "planned",
  }),

  // ──────────────────────────────────────────────────────────────────────────
  // SOFTWARE / ENGINEERING
  // ──────────────────────────────────────────────────────────────────────────
  capability({
    id: "software-creation",
    name: "Software Creation",
    family: "software",
    canonicalEcosystem: "fresh-software",
    description: "Discover, build, publish, install and operate software.",
    existing: ["app stores", "IDEs", "developer platforms"],
    problems: ["Software creation, distribution and operation are disconnected."],
    fresh10x: ["Intent-to-application workflows.", "AI-assisted engineering.", "Portable permissions and identity."],
    future: ["Software that can be generated around a user's goal and evolve under governed approval."],
    consumers: ["software", "developer", "business", "work"],
    lifecycle: "planned",
    requiresHumanApproval: true,
  }),
  capability({
    id: "autonomous-engineering",
    name: "Autonomous Engineering",
    family: "developer",
    canonicalEcosystem: "ara6",
    description: "Requirements, design, implementation, testing, review and deployment assistance.",
    existing: ["AI coding assistants", "CI/CD automation"],
    problems: ["AI can generate code but the full engineering lifecycle remains fragmented."],
    fresh10x: ["End-to-end engineering workflow with tests, review and audit.", "Human approval at consequential boundaries."],
    future: ["Governed autonomous engineering teams that can maintain systems continuously without bypassing authority."],
    consumers: ["software", "ara6", "business"],
    lifecycle: "planned",
    requiresHumanApproval: true,
  }),
];

export function getCapability(id: string): CapabilityDefinition | undefined {
  return FRESH_CAPABILITIES.find((item) => item.id === id);
}

export function getCapabilitiesByEcosystem(ecosystemId: string): CapabilityDefinition[] {
  return FRESH_CAPABILITIES.filter((item) => item.canonicalEcosystem === ecosystemId);
}

export function getCapabilitiesConsumedBy(ecosystemId: string): CapabilityDefinition[] {
  return FRESH_CAPABILITIES.filter((item) => item.consumers.includes(ecosystemId) || item.consumers.includes("all"));
}

export function getCapabilitiesByFamily(family: CapabilityFamily): CapabilityDefinition[] {
  return FRESH_CAPABILITIES.filter((item) => item.family === family);
}

export const FRESH_CAPABILITY_COUNT = FRESH_CAPABILITIES.length;
