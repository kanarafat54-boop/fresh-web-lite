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
  { id: 'shorts', domain: 'media', status: 'wired', canonicalService: 'ShortsModule', notes: 'For-You ranking (engagement rate + recency decay + follow/hot boosts + seen-penalty) applied in loadShorts(). react/save/repost now write through interactWithShort/removeShortInteraction (universal_interactions), with a DB trigger mirroring into legacy short_likes/short_reposts/saved_shorts so existing counters/views keep working. follow stays on the legacy follows table (cross-cutting, not Shorts-specific). Needs a runtime check before verified.' },
  { id: 'universal-interactions', domain: 'interactions', status: 'wired', canonicalService: 'FreshInteractionService', notes: 'Added a remove command (react/save/repost/follow/vote can now be undone, which did not exist before). Shorts is migrated: react/save/repost write through this service, with a DB trigger (sync_universal_interaction_to_short_legacy) mirroring into short_likes/short_reposts/saved_shorts so existing counters/views are untouched. Needs a runtime check before verified.' },
  { id: 'comments', domain: 'interactions', status: 'discovered', canonicalService: 'FreshInteractionService' },
  { id: 'reactions', domain: 'interactions', status: 'discovered', canonicalService: 'FreshInteractionService' },
  { id: 'poll-votes', domain: 'interactions', status: 'discovered', canonicalService: 'FreshInteractionService' },
  { id: 'fresh-ai', domain: 'ai', status: 'wired', canonicalService: 'Fresh AI', notes: 'ConversationPanel now calls runIntelligence directly instead of the executionKernel/planningEngine stack, which always returned a canned 3-step plan regardless of input (intentAnalyzer/goalPlanner were stubs). Kernel stack left in place, unwired, for a future real capability-matching layer. Needs a runtime check before verified.' },
  { id: 'search', domain: 'knowledge', status: 'wired', canonicalService: 'Universal Search', notes: 'HomeDashboard command bar now calls runIntelligence / FeatureRegistry match; needs a runtime check before verified.' },
  { id: 'wallet', domain: 'finance', status: 'wired', canonicalService: 'Fresh Wallet', notes: 'WalletDashboard now sends Fresh Coin (username lookup via treasury_resolve_recipient + treasury_transfer_internal) and shows transaction history (treasury_my_transactions). Backing RPCs/ledger already existed and were server-authorized; only the UI was missing. TreasuryService.ts remains a separate, unused in-memory ledger — not wired to anything, left in place. Needs a runtime check before verified.' },
  { id: 'creator-economy', domain: 'commerce', status: 'discovered', canonicalService: 'Fresh Economic Engine' },
  { id: 'academy', domain: 'learning', status: 'discovered', canonicalService: 'Fresh Academy' },
  { id: 'workspaces', domain: 'organizations', status: 'discovered', canonicalService: 'Organization Workspaces' },
  { id: 'moderation', domain: 'trust-safety', status: 'discovered', canonicalService: 'Moderation / Trust' },
  { id: 'notifications', domain: 'platform', status: 'discovered', canonicalService: 'Notifications' },
  { id: 'accessibility', domain: 'platform', status: 'discovered', canonicalService: 'Accessibility Center' },
  { id: 'analytics', domain: 'economics', status: 'discovered', canonicalService: 'Fresh Economic Events' },
  { id: 'ara6', domain: 'developer', status: 'discovered', canonicalService: 'Ara6' },
  { id: 'feature-organizer', domain: 'platform', status: 'wired', canonicalService: 'FeatureOrganizer', notes: 'User enable/disable + reorder of nav, persisted to localStorage. Needs a runtime check before verified.' },
  { id: 'live', domain: 'media', status: 'discovered', canonicalService: 'Fresh Live', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'stories', domain: 'media', status: 'discovered', canonicalService: 'Fresh Stories', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'groups', domain: 'communication', status: 'discovered', canonicalService: 'Fresh Groups', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'communities', domain: 'communication', status: 'discovered', canonicalService: 'Fresh Communities', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'calls', domain: 'communication', status: 'discovered', canonicalService: 'Fresh Calls', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'treasure', domain: 'finance', status: 'discovered', canonicalService: 'Fresh Treasure', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'ads-campaigns', domain: 'commerce', status: 'discovered', canonicalService: 'Fresh Ads & Campaigns', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'work', domain: 'productivity', status: 'discovered', canonicalService: 'Fresh Work', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'automation', domain: 'ai', status: 'discovered', canonicalService: 'Fresh Automation', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'trust', domain: 'trust-safety', status: 'discovered', canonicalService: 'Fresh Trust', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'vr-ar', domain: 'media', status: 'discovered', canonicalService: 'Fresh VR/AR', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'language', domain: 'platform', status: 'discovered', canonicalService: 'Fresh Language', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'api-hub', domain: 'developer', status: 'discovered', canonicalService: 'Fresh API Hub', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'organizations', domain: 'organizations', status: 'discovered', canonicalService: 'Fresh Organizations', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
  { id: 'sports', domain: 'media', status: 'discovered', canonicalService: 'Fresh Sports', notes: 'Scaffolded as an honest placeholder route only (EcosystemPlaceholder) so real platform scale is visible. No backend, no data model, no logic yet.' },
];

export function getFeatureWiring(id: string): FeatureWiringEntry | undefined {
  return featureWiringRegistry.find((entry) => entry.id === id);
}
