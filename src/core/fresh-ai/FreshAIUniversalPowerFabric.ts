/**
 * Fresh AI Universal Power Fabric
 *
 * Canonical capability layer for every Fresh AI surface.
 * Existing AI implementations are treated as power providers and can be
 * migrated behind this contract without deleting their functionality.
 */

import type { FreshAIEntryPoint, FreshAICapability } from './FreshAIEverywhere';

export type FreshAIPowerDomain =
  | 'understanding'
  | 'conversation'
  | 'knowledge'
  | 'reasoning'
  | 'memory'
  | 'creation'
  | 'execution'
  | 'communication'
  | 'media'
  | 'developer'
  | 'automation'
  | 'verification'
  | 'governance';

export type FreshAIPower = {
  id: string;
  name: string;
  domain: FreshAIPowerDomain;
  capabilities: FreshAICapability[];
  source: string;
  enabled: boolean;
};

export type FreshAIPowerRequest = {
  capability: FreshAICapability;
  ecosystem: FreshAIEntryPoint['ecosystem'];
  power?: string;
  input: unknown;
  userId?: string;
  sessionId?: string;
  requiresApproval?: boolean;
};

export type FreshAIPowerResolution = {
  power: FreshAIPower;
  capability: FreshAICapability;
  approved: boolean;
};

/**
 * Canonical powers already represented by the Fresh AI architecture.
 * These are contracts, not claims that every provider is production-wired.
 */
export const FRESH_AI_UNIVERSAL_POWERS: readonly FreshAIPower[] = [
  { id: 'understand', name: 'Understand', domain: 'understanding', capabilities: ['chat', 'analyze', 'translate'], source: 'Fresh AI Kernel / context fabric', enabled: true },
  { id: 'conversation', name: 'Conversation', domain: 'conversation', capabilities: ['chat', 'voice', 'summarize'], source: 'Fresh AI conversation layer', enabled: true },
  { id: 'knowledge', name: 'Knowledge & Search', domain: 'knowledge', capabilities: ['search', 'research', 'learn', 'verify'], source: 'Research / search / knowledge systems', enabled: true },
  { id: 'reasoning', name: 'Reasoning', domain: 'reasoning', capabilities: ['analyze', 'plan', 'verify'], source: 'Fresh Reasoning / dimensional intelligence', enabled: true },
  { id: 'memory', name: 'Memory', domain: 'memory', capabilities: ['remember', 'learn', 'chat'], source: 'Fresh Memory Fabric', enabled: true },
  { id: 'creation', name: 'Creation', domain: 'creation', capabilities: ['create', 'code', 'translate'], source: 'Creative / developer capabilities', enabled: true },
  { id: 'execution', name: 'Action & Agents', domain: 'execution', capabilities: ['act', 'plan', 'verify'], source: 'ARA6 / agent execution', enabled: true },
  { id: 'communication', name: 'Communication', domain: 'communication', capabilities: ['chat', 'voice', 'translate', 'summarize'], source: 'Messages / Chatting / Communities', enabled: true },
  { id: 'media', name: 'Media Intelligence', domain: 'media', capabilities: ['analyze', 'search', 'create', 'summarize'], source: 'Fresh Flow / shared media intelligence', enabled: true },
  { id: 'developer', name: 'Engineering', domain: 'developer', capabilities: ['code', 'analyze', 'plan', 'act'], source: 'Engineering workspace / ARA6', enabled: true },
  { id: 'automation', name: 'Automation', domain: 'automation', capabilities: ['automate', 'plan', 'act'], source: 'Automation / agent systems', enabled: true },
  { id: 'verification', name: 'Verification & Truth', domain: 'verification', capabilities: ['verify', 'research', 'analyze'], source: 'Truth / verification / evaluation systems', enabled: true },
  { id: 'governance', name: 'Safety & Governance', domain: 'governance', capabilities: ['verify', 'act'], source: 'Safety / permissions / policy / approval', enabled: true },
] as const;

const POWER_ALIASES: Record<string, string> = {
  understanding: 'understand',
  context: 'understand',
  intelligence: 'reasoning',
  reasoning: 'reasoning',
  memory: 'memory',
  research: 'knowledge',
  search: 'knowledge',
  creation: 'creation',
  creative: 'creation',
  engineering: 'developer',
  coding: 'developer',
  developer: 'developer',
  agents: 'execution',
  execution: 'execution',
  action: 'execution',
  automation: 'automation',
  verification: 'verification',
  truth: 'verification',
  safety: 'governance',
  governance: 'governance',
};

export function normalizeFreshAIPower(power?: string): string | undefined {
  if (!power) return undefined;
  const normalized = power.trim().toLowerCase();
  return POWER_ALIASES[normalized] ?? normalized;
}

export function getFreshAIPower(powerId: string): FreshAIPower | undefined {
  const normalized = normalizeFreshAIPower(powerId);
  return FRESH_AI_UNIVERSAL_POWERS.find((power) => power.id === normalized);
}

export function resolveFreshAIPower(
  request: FreshAIPowerRequest,
): FreshAIPowerResolution | undefined {
  const candidates = request.power
    ? [getFreshAIPower(request.power)]
    : FRESH_AI_UNIVERSAL_POWERS.filter((power) =>
        power.capabilities.includes(request.capability),
      );

  const power = candidates.find(
    (candidate): candidate is FreshAIPower =>
      Boolean(candidate?.enabled && candidate.capabilities.includes(request.capability)),
  );

  if (!power) return undefined;

  return {
    power,
    capability: request.capability,
    // Approval is a boundary decision; the fabric never silently approves actions.
    approved: request.requiresApproval !== true,
  };
}

export function getFreshAIPowersForCapability(
  capability: FreshAICapability,
): FreshAIPower[] {
  return FRESH_AI_UNIVERSAL_POWERS.filter(
    (power) => power.enabled && power.capabilities.includes(capability),
  );
}

export function assertFreshAIUniversalPowerIntegrity(): void {
  const ids = new Set<string>();

  for (const power of FRESH_AI_UNIVERSAL_POWERS) {
    if (ids.has(power.id)) {
      throw new Error(`Duplicate Fresh AI power: ${power.id}`);
    }
    ids.add(power.id);

    if (power.capabilities.length === 0) {
      throw new Error(`Fresh AI power has no capabilities: ${power.id}`);
    }

    for (const capability of power.capabilities) {
      if (!capability) {
        throw new Error(`Fresh AI power has an invalid capability: ${power.id}`);
      }
    }
  }
}
