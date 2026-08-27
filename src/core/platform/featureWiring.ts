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
  { id: 'shorts', domain: 'media', status: 'wired', canonicalService: 'ShortsModule', notes: 'For-You ranking (engagement rate + recency decay + follow/hot boosts + seen-penalty) applied in loadShorts(); search results stay relevance-ordered, unranked. Still reads/writes short_likes, saved_shorts, short_reposts, follows directly — has NOT been migrated onto universal_interactions (see that entry below). Needs a runtime check before verified.' },
  { id: 'universal-interactions', domain: 'interactions', status: 'wired', canonicalService: 'FreshInteractionService', notes: 'Service + Supabase persistence (universal_interactions table) exist and compile, via ShortsUniversalInteractionAdapter. BUT: the 20260827000000 migration deliberately keeps existing Posts/Shorts tables intact — universal_interactions is a parallel table with no trigger syncing it back into shorts.like_count/comment_count/repost_count or short_reaction_breakdown/short_recent_activity. ShortsModule does not call this adapter; it still uses short_likes/saved_shorts/short_reposts/follows directly. Wiring Shorts onto this adapter today would be a regression (reactions would persist but not display, counts would not move). Needs a product decision + count-sync migration before Shorts can adopt it.' },
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
];

export function getFeatureWiring(id: string): FeatureWiringEntry | undefined {
  return featureWiringRegistry.find((entry) => entry.id === id);
}
