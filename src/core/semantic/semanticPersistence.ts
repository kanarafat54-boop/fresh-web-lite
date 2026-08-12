import type { SemanticClaim, SemanticEvidence } from "./types";

export interface SemanticPersistence {
  persistResearchGraph(input: {
    entities: Array<{ id: string; entityType: string; label: string; attributes?: unknown }>;
    sources: Array<{ id: string; provider: string; name?: string; url?: string; reliability?: number; metadata?: unknown }>;
    claims: SemanticClaim[];
    evidence: SemanticEvidence[];
    claimEvidence: Array<{ claimId: string; evidenceId: string; stance: "supports" | "contradicts" | "uncertain"; stanceConfidence?: number }>;
    relations: Array<{ leftClaimId: string; rightClaimId: string; relation: "same" | "supports" | "contradicts" | "unrelated" | "conditional_contradiction"; confidence: number; rationale?: string }>;
    arbitrations: Array<{ leftClaimId: string; rightClaimId: string; decision: string; confidence: number; rationale: string; requiresHumanReview?: boolean; retainedClaimIds?: string[]; supersededClaimIds?: string[] }>;
  }): Promise<void>;
}

/**
 * Server-side persistence adapter contract.
 * The browser must never receive a service-role credential.
 * Production implementation belongs behind a trusted server/Edge Function boundary.
 */
export function createSemanticPersistenceAdapter(write: SemanticPersistence): SemanticPersistence {
  return {
    async persistResearchGraph(input) {
      if (!input.claims.length && !input.evidence.length && !input.entities.length) return;
      await write.persistResearchGraph(input);
    },
  };
}
