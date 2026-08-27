/**
 * TRUEMODE feature wiring registry.
 *
 * This is deliberately a registry, not a fake implementation. A capability is
 * only marked verified after an actual compile/deploy/runtime check records
 * evidence elsewhere.
 */
export type FeatureWiringStatus = 'discovered' | 'wired' | 'verified' | 'blocked';

export type FeatureWiringEntry = {
  id: string;
  domain: string;
  status: FeatureWiringStatus;
  canonicalService: string;
  notes?: string;
};

export const featureWiringRegistry: FeatureWiringEntry[] = [
  { id: 'fresh-id', domain: 'identity', status: 'discovered', canonicalService: 'FreshIdContext' },
  { id: 'fresh-flow', domain: 'media', status: 'discovered', canonicalService: 'Fresh Flow' },
  { id: 'shorts', domain: 'media', status: 'wired', canonicalService: 'ShortsModule', notes: 'For-You ranking (engagement rate + recency decay + follow/hot boosts + seen-penalty) applied in loadShorts(); search results stay relevance-ordered, unranked. Needs a runtime check before verified.' },
  { id: 'universal-interactions', domain: 'interactions', status: 'wired', canonicalService: 'FreshInteractionService' },
  { id: 'comments', domain: 'interactions', status: 'discovered', canonicalService: 'FreshInteractionService' },
  { id: 'reactions', domain: 'interactions', status: 'discovered', canonicalService: 'FreshInteractionService' },
  { id: 'poll-votes', domain: 'interactions', status: 'discovered', canonicalService: 'FreshInteractionService' },
  { id: 'fresh-ai', domain: 'ai', status: 'wired', canonicalService: 'Fresh AI', notes: 'ConversationPanel now calls runIntelligence directly instead of the executionKernel/planningEngine stack, which always returned a canned 3-step plan regardless of input (intentAnalyzer/goalPlanner were stubs). Kernel stack left in place, unwired, for a future real capability-matching layer. Needs a runtime check before verified.' },
  { id: 'search', domain: 'knowledge', status: 'wired', canonicalService: 'Universal Search', notes: 'HomeDashboard command bar now calls runIntelligence / FeatureRegistry match; needs a runtime check before verified.' },
  { id: 'wallet', domain: 'finance', status: 'discovered', canonicalService: 'Fresh Wallet' },
  { id: 'creator-economy', domain: 'commerce', status: 'discovered', canonicalService: 'Fresh Economic Engine' },
  { id: 'academy', domain: 'learning', status: 'discovered', canonicalService: 'Fresh Academy' },
  { id: 'workspaces', domain: 'organizations', status: 'discovered', canonicalService: 'Organization Workspaces' },
  { id: 'moderation', domain: 'trust-safety', status: 'discovered', canonicalService: 'Moderation / Trust' },
  { id: 'notifications', domain: 'platform', status: 'discovered', canonicalService: 'Notifications' },
  { id: 'accessibility', domain: 'platform', status: 'discovered', canonicalService: 'Accessibility Center' },
  { id: 'analytics', domain: 'economics', status: 'discovered', canonicalService: 'Fresh Economic Events' },
  { id: 'ara6', domain: 'developer', status: 'discovered', canonicalService: 'Ara6' },
  { id: 'feature-organizer', domain: 'platform', status: 'wired', canonicalService: 'FeatureOrganizer', notes: 'User enable/disable + reorder of nav, persisted to localStorage. Needs a runtime check before verified.' },
];

export function getFeatureWiring(id: string): FeatureWiringEntry | undefined {
  return featureWiringRegistry.find((entry) => entry.id === id);
}
