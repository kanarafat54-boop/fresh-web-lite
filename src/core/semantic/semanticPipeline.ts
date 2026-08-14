import type { ClaimAssessment, SemanticClaim, SemanticEvidence } from "./types";
import { semanticStore } from "./semanticStore";
import { ingestWebResearch, type WebResearchIngestion } from "./webResearchBridge";
import { assessClaim, compareClaims, registerClaim, type Claim } from "./claimIntelligence";
import { calibrateClaimConfidence } from "./confidenceCalibration";
import { buildEvidenceLineage } from "./evidenceLineage";
import { arbitrateClaimSet, type BeliefArbitration } from "./beliefArbitration";
import { assessClaimInTemporalContext, type TemporalClaimRecord } from "./temporalClaimEngine";

export type ResearchClaimInput = Omit<Claim, "normalizedStatement"> & { evidenceIds?: string[]; counterEvidenceIds?: string[] };
export type SemanticResearchPipelineResult = { knowledge: ReturnType<typeof ingestWebResearch>; claims: SemanticClaim[]; confidence: ReturnType<typeof calibrateClaimConfidence>[]; lineage: ReturnType<typeof buildEvidenceLineage>; arbitration: BeliefArbitration[]; temporal: TemporalClaimRecord[] };

function evidenceForClaim(claim: SemanticClaim): SemanticEvidence[] {
  const ids = new Set([...claim.evidenceIds, ...claim.counterEvidenceIds]);
  return semanticStore.getEvidence().filter((item) => ids.has(item.id));
}

function toClaimInput(claim: SemanticClaim): Omit<Claim, "normalizedStatement"> {
  return { id: claim.id, subjectEntityId: claim.subjectEntityId ?? "", predicate: claim.predicate, object: String(claim.object), statement: `${claim.predicate} ${String(claim.object)}`, observedAt: claim.lastObservedAt, validFrom: claim.validFrom, validTo: claim.validTo, confidence: claim.confidence };
}

function toTemporalAssessment(assessment: ReturnType<typeof compareClaims>): ClaimAssessment {
  const relation = assessment.relation === "supporting" ? "supports" : assessment.relation === "contradictory" ? "contradicts" : assessment.relation;
  return { relation, confidence: assessment.confidence, reasons: [assessment.rationale] };
}

export function runSemanticResearchPipeline(research: WebResearchIngestion, extractedClaims: ResearchClaimInput[], assessedAt = new Date().toISOString()): SemanticResearchPipelineResult {
  const knowledge = ingestWebResearch(research);
  const claims: SemanticClaim[] = [];

  for (const input of extractedClaims) {
    const initial = assessClaim({ ...input, observedAt: input.observedAt ?? assessedAt });
    const evidenceIds = input.evidenceIds ?? initial.supportingEvidence.map((item) => item.id);
    const counterEvidenceIds = input.counterEvidenceIds ?? initial.counterEvidence.map((item) => item.id);
    registerClaim(initial);
    const stored = semanticStore.getClaim(initial.claim.id);
    if (stored) {
      const claim: SemanticClaim = { ...stored, evidenceIds, counterEvidenceIds };
      claims.push(claim);
      semanticStore.upsertClaim(claim);
    }
  }

  const evidence = semanticStore.getEvidence();
  const confidence = claims.map((claim) => calibrateClaimConfidence(claim, evidenceForClaim(claim), [], [], claims, assessedAt));
  for (let i = 0; i < claims.length; i += 1) {
    const assessment = confidence[i];
    const status = assessment.decision === "contested" ? "contested" : assessment.decision === "supported" ? "supported" : "uncertain";
    claims[i] = { ...claims[i], confidence: assessment.confidence, status };
    semanticStore.upsertClaim(claims[i]);
  }

  const lineage = buildEvidenceLineage(evidence);
  const arbitration = arbitrateClaimSet(claims, evidence, new Map(), assessedAt);

  const temporal = claims.map((claim) => {
    const relatedClaims = claims.filter((other) => other.id !== claim.id).map((other) => ({ claim: other, assessment: toTemporalAssessment(compareClaims(toClaimInput(claim), toClaimInput(other))) }));
    return assessClaimInTemporalContext(claim, relatedClaims, assessedAt);
  });

  return { knowledge, claims, confidence, lineage, arbitration, temporal };
}
