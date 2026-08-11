import type { SemanticClaim, SemanticEvidence } from "./types";
import { semanticStore } from "./semanticStore";
import { ingestWebResearch, type WebResearchIngestion } from "./webResearchBridge";
import { assessClaim, registerClaim, type Claim } from "./claimIntelligence";
import { assessClaimConfidence } from "./claimConfidence";
import { buildEvidenceLineage } from "./evidenceLineage";
import { arbitrateClaimSet, type BeliefArbitration } from "./beliefArbitration";
import { assessClaimInTemporalContext, type TemporalClaimRecord } from "./temporalClaimEngine";

export type ResearchClaimInput = Omit<Claim, "normalizedStatement"> & { evidenceIds?: string[]; counterEvidenceIds?: string[] };

export type SemanticResearchPipelineResult = {
  knowledge: ReturnType<typeof ingestWebResearch>;
  claims: SemanticClaim[];
  confidence: ReturnType<typeof assessClaimConfidence>[];
  lineage: ReturnType<typeof buildEvidenceLineage>;
  arbitration: BeliefArbitration[];
  temporal: TemporalClaimRecord[];
};

function evidenceForClaim(claim: SemanticClaim): SemanticEvidence[] {
  const ids = new Set([...claim.evidenceIds, ...claim.counterEvidenceIds]);
  return semanticStore.getEvidence().filter((item) => ids.has(item.id));
}

export function runSemanticResearchPipeline(
  research: WebResearchIngestion,
  extractedClaims: ResearchClaimInput[],
  assessedAt = new Date().toISOString(),
): SemanticResearchPipelineResult {
  const knowledge = ingestWebResearch(research);
  const claims: SemanticClaim[] = [];

  for (const input of extractedClaims) {
    const assessment = assessClaim({ ...input, observedAt: input.observedAt ?? assessedAt });
    const evidenceIds = input.evidenceIds ?? assessment.supportingEvidence.map((item) => item.id);
    const counterEvidenceIds = input.counterEvidenceIds ?? assessment.counterEvidence.map((item) => item.id);
    const claim: SemanticClaim = {
      ...assessment.claim,
      subjectEntityId: assessment.claim.subjectEntityId || undefined,
      status: assessment.counterEvidence.length && assessment.supportingEvidence.length ? "contested" : assessment.supportingEvidence.length ? "supported" : "uncertain",
      confidence: assessment.confidence,
      evidenceIds,
      counterEvidenceIds,
    };
    registerClaim({ ...assessment, claim });
    claims.push(claim);
  }

  const confidence = claims.map((claim) => assessClaimConfidence(claim, evidenceForClaim(claim), new Map(), assessedAt));
  const lineage = buildEvidenceLineage(semanticStore.getEvidence());
  const arbitration = arbitrateClaimSet(claims);
  const temporal = claims.map((claim) => assessClaimInTemporalContext(claim, [] as Array<{ claim: SemanticClaim; assessment: import("./types").ClaimAssessment }>, assessedAt));

  return { knowledge, claims, confidence, lineage, arbitration, temporal };
}
