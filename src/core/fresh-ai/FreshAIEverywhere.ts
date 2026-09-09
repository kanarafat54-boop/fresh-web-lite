/**
 * Fresh AI Everywhere
 *
 * Canonical registry for making Fresh AI a shared intelligence layer across
 * every Fresh ecosystem. This is intentionally UI-agnostic: products expose
 * the same AI capability through context-aware entry points instead of
 * building separate assistants for each surface.
 */

export type FreshAIEcosystem =
  | 'home'
  | 'fresh-flow'
  | 'shorts'
  | 'long-videos'
  | 'news-posts'
  | 'ar-vr'
  | 'podcasts'
  | 'messages'
  | 'chatting'
  | 'groups'
  | 'communities'
  | 'profile'
  | 'wallet'
  | 'crypto'
  | 'academy'
  | 'search'
  | 'creator-studio'
  | 'workspace'
  | 'developer'
  | 'settings';

export type FreshAICapability =
  | 'chat'
  | 'voice'
  | 'search'
  | 'research'
  | 'analyze'
  | 'create'
  | 'translate'
  | 'summarize'
  | 'plan'
  | 'remember'
  | 'learn'
  | 'act'
  | 'code'
  | 'automate'
  | 'verify';

export type FreshAIEntryPoint = {
  id: string;
  ecosystem: FreshAIEcosystem;
  label: string;
  capabilities: readonly FreshAICapability[];
  contextAware: true;
  usesCanonicalGateway: true;
};

/**
 * Every product surface can expose Fresh AI without owning a second AI stack.
 * Capabilities are deliberately broad; policy, permissions and verification
 * remain enforced by the canonical intelligence gateway and downstream layers.
 */
export const FRESH_AI_EVERYWHERE: readonly FreshAIEntryPoint[] = [
  { id: 'home-ai', ecosystem: 'home', label: 'Fresh AI', capabilities: ['chat', 'search', 'create', 'act'], contextAware: true, usesCanonicalGateway: true },
  { id: 'flow-ai', ecosystem: 'fresh-flow', label: 'Fresh AI', capabilities: ['chat', 'search', 'research', 'analyze', 'create', 'translate', 'summarize', 'learn', 'act'], contextAware: true, usesCanonicalGateway: true },
  { id: 'shorts-ai', ecosystem: 'shorts', label: 'Ask Fresh AI', capabilities: ['chat', 'analyze', 'summarize', 'translate', 'search', 'create'], contextAware: true, usesCanonicalGateway: true },
  { id: 'long-videos-ai', ecosystem: 'long-videos', label: 'Ask Fresh AI', capabilities: ['chat', 'analyze', 'summarize', 'search', 'research', 'translate', 'learn'], contextAware: true, usesCanonicalGateway: true },
  { id: 'news-ai', ecosystem: 'news-posts', label: 'Fresh AI Context', capabilities: ['chat', 'search', 'research', 'analyze', 'summarize', 'verify', 'translate'], contextAware: true, usesCanonicalGateway: true },
  { id: 'ar-vr-ai', ecosystem: 'ar-vr', label: 'Fresh AI', capabilities: ['chat', 'voice', 'analyze', 'create', 'translate', 'act'], contextAware: true, usesCanonicalGateway: true },
  { id: 'podcasts-ai', ecosystem: 'podcasts', label: 'Ask Fresh AI', capabilities: ['chat', 'search', 'analyze', 'summarize', 'research', 'translate', 'learn'], contextAware: true, usesCanonicalGateway: true },
  { id: 'messages-ai', ecosystem: 'messages', label: 'Fresh AI', capabilities: ['chat', 'voice', 'translate', 'summarize', 'create', 'act'], contextAware: true, usesCanonicalGateway: true },
  { id: 'chatting-ai', ecosystem: 'chatting', label: 'Fresh AI', capabilities: ['chat', 'voice', 'translate', 'summarize', 'create'], contextAware: true, usesCanonicalGateway: true },
  { id: 'groups-ai', ecosystem: 'groups', label: 'Fresh AI', capabilities: ['chat', 'summarize', 'translate', 'research', 'create', 'act'], contextAware: true, usesCanonicalGateway: true },
  { id: 'communities-ai', ecosystem: 'communities', label: 'Fresh AI', capabilities: ['chat', 'summarize', 'research', 'translate', 'create', 'act'], contextAware: true, usesCanonicalGateway: true },
  { id: 'profile-ai', ecosystem: 'profile', label: 'Fresh AI', capabilities: ['chat', 'analyze', 'create', 'summarize', 'remember', 'act'], contextAware: true, usesCanonicalGateway: true },
  { id: 'wallet-ai', ecosystem: 'wallet', label: 'Fresh AI', capabilities: ['chat', 'analyze', 'plan', 'verify', 'act'], contextAware: true, usesCanonicalGateway: true },
  { id: 'crypto-ai', ecosystem: 'crypto', label: 'Fresh AI', capabilities: ['chat', 'analyze', 'research', 'plan', 'verify'], contextAware: true, usesCanonicalGateway: true },
  { id: 'academy-ai', ecosystem: 'academy', label: 'Fresh AI Tutor', capabilities: ['chat', 'voice', 'search', 'research', 'analyze', 'translate', 'learn', 'create'], contextAware: true, usesCanonicalGateway: true },
  { id: 'search-ai', ecosystem: 'search', label: 'Fresh AI', capabilities: ['chat', 'search', 'research', 'analyze', 'verify', 'summarize', 'create'], contextAware: true, usesCanonicalGateway: true },
  { id: 'creator-ai', ecosystem: 'creator-studio', label: 'Fresh AI Studio', capabilities: ['chat', 'create', 'analyze', 'research', 'translate', 'automate', 'verify'], contextAware: true, usesCanonicalGateway: true },
  { id: 'workspace-ai', ecosystem: 'workspace', label: 'Fresh AI Workspace', capabilities: ['chat', 'research', 'analyze', 'create', 'code', 'plan', 'automate', 'act', 'verify'], contextAware: true, usesCanonicalGateway: true },
  { id: 'developer-ai', ecosystem: 'developer', label: 'Fresh AI Engineering', capabilities: ['chat', 'code', 'research', 'analyze', 'create', 'plan', 'act', 'verify'], contextAware: true, usesCanonicalGateway: true },
  { id: 'settings-ai', ecosystem: 'settings', label: 'Fresh AI', capabilities: ['chat', 'analyze', 'plan', 'act', 'verify'], contextAware: true, usesCanonicalGateway: true },
];

export function getFreshAIEntryPoint(ecosystem: FreshAIEcosystem): FreshAIEntryPoint {
  const entryPoint = FRESH_AI_EVERYWHERE.find((entry) => entry.ecosystem === ecosystem);

  if (!entryPoint) {
    throw new Error(`Fresh AI is not registered for ecosystem: ${ecosystem}`);
  }

  return entryPoint;
}

export function supportsFreshAICapability(
  ecosystem: FreshAIEcosystem,
  capability: FreshAICapability,
): boolean {
  return getFreshAIEntryPoint(ecosystem).capabilities.includes(capability);
}
