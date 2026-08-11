import { semanticStore } from "./semanticStore";
import type { SemanticEvidence } from "./types";

export type ClaimRelation = "same" | "supporting" | "contradictory" | "unrelated";

export type Claim = {
  id: string;
  subjectEntityId: string;
  predicate: string;
  object: string;
  statement: string;
  normalizedStatement: string;
  observedAt: string;
  validFrom?: string;
  validTo?: string;
  confidence: number;
};

export type ClaimAssessment = {
  claim: Claim;
  relationToExisting: ClaimRelation;
  similarity: number;
  supportingEvidence: SemanticEvidence[];
  counterEvidence: SemanticEvidence[];
  confidence: number;
  rationale: string;
};

const normalize = (value: string): string => value.toLocaleLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const tokens = (value: string): Set<string> => new Set(normalize(value).split(" ").filter(Boolean));
const similarity = (a: string, b: string): number => { const left=tokens(a), right=tokens(b); if(!left.size||!right.size)return 0; let intersection=0; for(const token of left)if(right.has(token))intersection++; return intersection/new Set([...left,...right]).size; };
const evidenceForClaim = (statement: string): SemanticEvidence[] => semanticStore.getEvidence().filter((item) => similarity(item.claim, statement) >= 0.35);
const evidenceBalance = (supporting: SemanticEvidence[], counter: SemanticEvidence[]): number => {
  const total = supporting.length + counter.length;
  return total === 0 ? 0 : (supporting.length - counter.length) / total;
};

export function createClaim(input: Omit<Claim, "normalizedStatement">): Claim { return { ...input, normalizedStatement: normalize(input.statement) }; }

export function compareClaims(left: Claim, right: Claim): { relation: ClaimRelation; similarity: number; confidence: number; rationale: string } {
  if(left.subjectEntityId!==right.subjectEntityId) return {relation:"unrelated",similarity:0,confidence:.95,rationale:"Claims refer to different resolved entities."};
  const predicateScore=similarity(left.predicate,right.predicate), objectScore=similarity(left.object,right.object), statementScore=similarity(left.statement,right.statement);
  if(statementScore>=.88 || (predicateScore>=.8 && objectScore>=.8)) return {relation:"same",similarity:statementScore,confidence:statementScore,rationale:"The claims describe substantially the same predicate and object."};
  if(predicateScore>=.65 && objectScore<.25) return {relation:"contradictory",similarity:statementScore,confidence:predicateScore*.8,rationale:"The claims concern the same subject and predicate but assert materially different objects."};
  if(predicateScore>=.5 && objectScore>=.25) return {relation:"supporting",similarity:statementScore,confidence:Math.min(.95,(predicateScore+objectScore)/2),rationale:"The claims overlap on subject, predicate, and object meaning without being identical."};
  return {relation:"unrelated",similarity:statementScore,confidence:1-statementScore,rationale:"The claims do not contain enough shared meaning."};
}

export function assessClaim(input: Omit<Claim, "normalizedStatement">): ClaimAssessment {
  const claim=createClaim(input);
  const evidence=evidenceForClaim(claim.statement);
  const supportingEvidence=evidence.filter((item)=>item.supports!==false);
  const counterEvidence=evidence.filter((item)=>item.supports===false);
  const existing=semanticStore.queryEntities({type:"concept"]).filter((entity)=>similarity(entity.label,claim.statement)>=.35);
  let relationToExisting: ClaimRelation="unrelated"; let bestSimilarity=0; let rationale="No sufficiently related existing claim was found.";
  for(const entity of existing){
    const candidate: Claim={id:entity.id,subjectEntityId:String(entity.attributes.find(a=>a.key==="subjectEntityId")?.value??""),predicate:String(entity.attributes.find(a=>a.key==="predicate")?.value??""),object:String(entity.attributes.find(a=>a.key==="object")?.value??""),statement:entity.label,normalizedStatement:normalize(entity.label),observedAt:claim.observedAt,confidence:Number(entity.attributes.find(a=>a.key==="confidence")?.value??.5)};
    const comparison=compareClaims(claim,candidate);
    if(comparison.confidence>bestSimilarity){bestSimilarity=comparison.confidence;relationToExisting=comparison.relation;rationale=comparison.rationale;}
  }
  if(supportingEvidence.length>0&&counterEvidence.length>0){relationToExisting="contradictory";rationale="Independent evidence currently contains both supporting and counter-evidence; the claim remains contested.";}
  const balance=evidenceBalance(supportingEvidence,counterEvidence);
  const sourceCount=new Set(evidence.map(e=>e.sourceUrl)).size;
  const diversityBonus=Math.min(.12,Math.max(0,sourceCount-1)*.03);
  const confidence=Math.max(0,Math.min(1,input.confidence*.65+(balance+1)*.17+diversityBonus));
  return {claim,relationToExisting,similarity:bestSimilarity,supportingEvidence,counterEvidence,confidence,rationale};
}

export function registerClaim(assessment: ClaimAssessment): void {
  semanticStore.upsertEntity({id:assessment.claim.id,type:"concept",label:assessment.claim.statement,attributes:[
    {key:"subjectEntityId",value:assessment.claim.subjectEntityId,source:"ai",confidence:assessment.confidence,observedAt:assessment.claim.observedAt},
    {key:"predicate",value:assessment.claim.predicate,source:"ai",confidence:assessment.confidence,observedAt:assessment.claim.observedAt},
    {key:"object",value:assessment.claim.object,source:"ai",confidence:assessment.confidence,observedAt:assessment.claim.observedAt},
    {key:"claimRelation",value:assessment.relationToExisting,source:"ai",confidence:assessment.confidence,observedAt:assessment.claim.observedAt},
    {key:"confidence",value:assessment.confidence,source:"inferred",confidence:1,observedAt:assessment.claim.observedAt},
    {key:"validFrom",value:assessment.claim.validFrom??null,source:"ai",confidence:1,observedAt:assessment.claim.observedAt},
    {key:"validTo",value:assessment.claim.validTo??null,source:"ai",confidence:1,observedAt:assessment.claim.observedAt},
    {key:"supportingEvidenceIds",value:assessment.supportingEvidence.map(e=>e.id).join(","),source:"web",confidence:1,observedAt:assessment.claim.observedAt,provenance:assessment.supportingEvidence.map(e=>e.sourceUrl)},
    {key:"counterEvidenceIds",value:assessment.counterEvidence.map(e=>e.id).join(","),source:"web",confidence:1,observedAt:assessment.claim.observedAt,provenance:assessment.counterEvidence.map(e=>e.sourceUrl)},
  ],createdAt:assessment.claim.observedAt,updatedAt:assessment.claim.observedAt});
}
