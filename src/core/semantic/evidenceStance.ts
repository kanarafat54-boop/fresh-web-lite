import type { SemanticEvidence } from "./types.js";
import type { Claim } from "./claimIntelligence.js";

export type EvidenceStance = "supports" | "contradicts" | "uncertain";
export type EvidenceStanceAssessment = {
  evidenceId: string;
  stance: EvidenceStance;
  confidence: number;
  rationale: string;
};

const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const tokenSet = (value: string) => new Set(normalize(value).split(" ").filter((token) => token.length > 1));

const contradictionMarkers = new Set(["not", "never", "no", "none", "false", "denied", "denies", "opposes", "opposed", "failed", "fails", "rejected", "incorrect", "wrong", "debunked", "disputed", "unlikely"]);

function overlapScore(a: string, b: string): number {
  const left = tokenSet(a); const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.max(1, left.size + right.size - overlap);
}
function containsNegation(text: string): boolean { return normalize(text).split(" ").some((token) => contradictionMarkers.has(token)); }

export function assessEvidenceStance(claim: Claim, evidence: SemanticEvidence): EvidenceStanceAssessment {
  const similarity = overlapScore(claim.statement, evidence.claim);
  if (similarity < 0.22) return { evidenceId: evidence.id, stance: "uncertain", confidence: 1 - similarity, rationale: "The evidence text has insufficient semantic overlap with the claim." };
  const claimNegated = containsNegation(claim.statement); const evidenceNegated = containsNegation(evidence.claim);
  if (claimNegated !== evidenceNegated && similarity >= 0.35) return { evidenceId: evidence.id, stance: "contradicts", confidence: Math.min(0.96, 0.55 + similarity * 0.4), rationale: "The evidence and claim share substantial content but differ in negation/polarity." };
  return { evidenceId: evidence.id, stance: "supports", confidence: Math.min(0.95, 0.45 + similarity * 0.5), rationale: "The evidence and claim have aligned semantic content without a detected polarity conflict." };
}
export function classifyEvidenceForClaim(claim: Claim, evidence: SemanticEvidence[]): EvidenceStanceAssessment[] { return evidence.map((item) => assessEvidenceStance(claim, item)); }
