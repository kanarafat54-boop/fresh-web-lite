import { semanticStore } from "./semanticStore";
import type { SemanticEvidence, SemanticRelation } from "./types";
import type { ClaimAssessment } from "./claimIntelligence";

export type ClaimGraphNode = { claimId: string; confidence: number; supporting: SemanticEvidence[]; counter: SemanticEvidence[] };

export function linkClaimAssessment(assessment: ClaimAssessment): ClaimGraphNode {
  const claimId = assessment.claim.id;
  const links: Array<[string, string, number]> = [];
  for (const evidence of assessment.supportingEvidence) links.push([claimId, `evidence:${evidence.id}`, 0.8]);
  for (const evidence of assessment.counterEvidence) links.push([`evidence:${evidence.id}`, claimId, 0.8]);

  links.forEach(([fromEntityId, toEntityId, confidence], index) => {
    const relation: SemanticRelation = {
      id: `claim-evidence-${claimId}-${index}`,
      fromEntityId,
      relation: assessment.counterEvidence.some((e) => `evidence:${e.id}` === fromEntityId) ? "challenges" : "supports",
      toEntityId,
      source: "ai",
      confidence,
      observedAt: assessment.claim.observedAt,
      provenance: [...assessment.supportingEvidence, ...assessment.counterEvidence].map((e) => e.sourceUrl),
    };
    semanticStore.upsertRelation(relation);
  });

  return { claimId, confidence: assessment.confidence, supporting: assessment.supportingEvidence, counter: assessment.counterEvidence };
}
