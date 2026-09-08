import type { Evidence, FreshIntent, FreshReasoningRequest, FreshReasoningResult, FreshSkill, FreshIntelligenceEngine, FreshPlanStep, FreshExecutionResult, FreshPipelineEvent, FreshPipelineStage } from "./FreshAIArchitecture.js";
import { SemanticTruthEngine } from "./semanticTruthEngine.js";
import { reasonAcrossDimensions } from "./dimensionalIntelligence.js";
import { executeFreshPlanThroughAra6 } from "./FreshARA6Bridge.js";
import { evaluateASIState } from "./asi.js";

export type FreshMemoryRecord = { id:string; content:string; scope:"user"|"project"|"platform"|"session"; createdAt:string; source?:string };
export type FreshSkillRegistry = { register(skill:FreshSkill):void; find(capabilities:string[]):FreshSkill[] };
export type FreshMemoryStore = { search(query:string, scope?:FreshMemoryRecord["scope"]):Promise<FreshMemoryRecord[]>; remember(record:FreshMemoryRecord):Promise<void> };
export type FreshTruthEngine = { evaluate(evidence:Evidence[]):Promise<Evidence[]> };
export type FreshExecutionContext = { approve?:boolean; requestId?:string; origin?:string; userId?:string|null };

const STAGES: FreshPipelineStage[] = ["understand","memory","retrieve","research","reason","plan","coordinate","execute","verify","proof","feedback","improve","govern"];

export class FreshAIKernel implements FreshIntelligenceEngine {
  private readonly skills: FreshSkillRegistry;
  private readonly memory: FreshMemoryStore;
  private readonly truth: FreshTruthEngine;

  constructor(skills: FreshSkillRegistry, memory: FreshMemoryStore, truth: FreshTruthEngine = new SemanticTruthEngine()) {
    this.skills = skills;
    this.memory = memory;
    this.truth = truth;
  }

  async understand(request:FreshReasoningRequest){
    const intent:FreshIntent=request.intent??inferIntent(request.input);
    const memories=await this.memory.search(request.input);
    return {intent,context:{...(request.context??{}),memories:Array.isArray(memories)?memories:[]}};
  }

  async retrieve(request:FreshReasoningRequest):Promise<Evidence[]> {
    const input=Array.isArray(request.evidence)?request.evidence:[];
    const evaluated=await this.truth.evaluate(input);
    return Array.isArray(evaluated)?evaluated:input;
  }

  async reason(request:FreshReasoningRequest,evidence:Evidence[]):Promise<FreshReasoningResult> {
    const safeEvidence=Array.isArray(evidence)?evidence:[];
    const capabilities=inferCapabilities(request.input,request.intent);
    const selectedSkills=this.skills.find(capabilities)??[];
    const dimensionalReasoning=reasonAcrossDimensions(request.input,Array.isArray(request.dimensions)?request.dimensions:undefined);
    const safeDimensions=Array.isArray(dimensionalReasoning)?dimensionalReasoning:[];
    const agents=Array.isArray(request.requestedAgents)?request.requestedAgents:[];
    const plan=selectedSkills.map((skill,index)=>({id:`step-${index+1}`,description:`Apply ${skill.name}`,skills:[skill.id],agent:agents[index]??inferAgent(skill.id),requiresApproval:false}));
    const base:FreshReasoningResult={
      answer:buildGroundedAnswer(request.input,safeEvidence,safeDimensions),
      claims:safeEvidence.map(item=>({statement:item.claim,truth:item.confidence>=.9?"KNOWN":item.confidence>=.6?"PROBABLE":"UNCERTAIN",confidence:item.confidence,evidence:[item]})),
      plan:Array.isArray(plan)?plan:[], actions:[], unknowns:safeEvidence.length?[]:["No external or persistent evidence was supplied to the native truth layer."],
      explanation:`Fresh AI used native capability composition, ${safeDimensions.length} dimensional reasoning lens(es), evidence grounding and governed execution boundaries.`,
      dimensionalReasoning:safeDimensions,
      pipeline:createPipeline()
    };
    return {...base,asi:evaluateASIState(request.input,base,base.plan)};
  }

  async plan(_request:FreshReasoningRequest,result:FreshReasoningResult){
    return Array.isArray(result.plan)?result.plan:[];
  }

  async verify(result:FreshReasoningResult){
    const claims=Array.isArray(result.claims)?result.claims:[];
    const unknowns=Array.isArray(result.unknowns)?result.unknowns:[];
    const plan=Array.isArray(result.plan)?result.plan:[];
    const dimensionalReasoning=Array.isArray(result.dimensionalReasoning)?result.dimensionalReasoning:[];
    const pipeline=markStage(result.pipeline??createPipeline(),"verify","completed","Contradiction and unknown checks applied",{claims:claims.length,unknowns:unknowns.length});
    const contradictions=claims.filter(claim=>claim.truth==="CONTRADICTED");
    const verified={...result,claims,plan,dimensionalReasoning,pipeline,unknowns:contradictions.length?[...new Set([...unknowns,`${contradictions.length} contradiction(s) require resolution before a definitive answer.`])]:unknowns};
    return {...verified,asi:evaluateASIState(verified.asi?.objective??verified.answer,verified,verified.plan)};
  }

  async execute(plan:FreshPlanStep[],context:FreshExecutionContext={}):Promise<FreshExecutionResult[]> {
    const safePlan=Array.isArray(plan)?plan:[];
    return executeFreshPlanThroughAra6(safePlan,Boolean(context.approve),{requestId:context.requestId,origin:context.origin,userId:context.userId});
  }
}

function createPipeline():FreshPipelineEvent[]{
  const now=new Date().toISOString();
  return STAGES.map((stage,index)=>({stage,status:index<4?"completed":"ready",startedAt:now,detail:stageDetail(stage)}));
}
function markStage(pipeline:FreshPipelineEvent[],stage:FreshPipelineStage,status:FreshPipelineEvent["status"],detail:string,metrics?:Record<string,number>):FreshPipelineEvent[]{
  const safe=Array.isArray(pipeline)?pipeline:createPipeline();
  return safe.map(event=>event.stage===stage?{...event,status,completedAt:new Date().toISOString(),detail,metrics}:event);
}
function stageDetail(stage:FreshPipelineStage):string { const labels:Record<FreshPipelineStage,string>={understand:"Interpret intent and goal",memory:"Load relevant durable and session context",retrieve:"Evaluate supplied evidence",research:"Select and invoke research capabilities",reason:"Compose native reasoning",plan:"Construct executable capability plan",coordinate:"Assign work to governed agents",execute:"Run approved tool actions",verify:"Check contradictions and unknowns",proof:"Assemble provenance and verification",feedback:"Accept outcome feedback",improve:"Generate measurable improvement proposals",govern:"Enforce policy and mutation boundaries"}; return labels[stage]; }

function inferIntent(input:string):FreshIntent { const value=input.toLowerCase(); if(/research|investigate|sources|evidence|verify|fact.?check/.test(value))return"research"; if(/build|code|debug|program|implement|fix|refactor/.test(value))return"code"; if(/design|ui|ux|interface|layout/.test(value))return"design"; if(/plan|roadmap|strategy|steps|how should/.test(value))return"plan"; if(/analy[sz]e|compare|why|how|explain|difference/.test(value))return"analyze"; if(/send|post|publish|buy|pay|delete|change|update|book|schedule|execute|run/.test(value))return"act"; if(/learn|teach|study|lesson|practice/.test(value))return"learn"; if(/find|discover|recommend|show me|where/.test(value))return"discover"; if(/create|write|make|generate|draft/.test(value))return"create"; return"answer"; }
function inferCapabilities(input:string,intent?:FreshIntent):string[]{ const value=input.toLowerCase(); const capabilities=["general-reasoning","deduction","induction","abduction","planning","causal-reasoning","constraint-solving","confidence-calibration","unknown-detection","metacognition"]; if(intent==="research"||/research|evidence|source|verify|fact.?check/.test(value))capabilities.push("research","evidence-analysis","scientific-discovery"); if(intent==="code"||/code|debug|build|program|implement|fix|refactor/.test(value))capabilities.push("code-generation","code-review","testing","architecture","optimization"); if(/security|vulnerability|threat|privacy/.test(value))capabilities.push("security","risk-analysis"); if(/math|equation|calculate|proof|statistics/.test(value))capabilities.push("mathematics","statistics"); if(intent==="design"||/design|ui|ux|interface|layout/.test(value))capabilities.push("ui-ux-design","design-systems","creative-synthesis"); if(intent==="learn"||/learn|teach|study|lesson|practice/.test(value))capabilities.push("learning","transfer-learning"); if(intent==="act"||/send|post|publish|buy|pay|delete|change|update|book|schedule|execute|run/.test(value))capabilities.push("automation","environment-modeling"); if(/strategy|long.?term|future|roadmap|mission/.test(value))capabilities.push("strategic-planning","counterfactual-reasoning"); return capabilities; }
function inferAgent(skillId:string){ if(skillId==="research")return"research" as const; if(skillId==="security")return"security" as const; if(skillId==="engineering")return"backend" as const; if(skillId==="design")return"frontend" as const; if(skillId==="mathematics")return"learning" as const; return undefined; }
function buildGroundedAnswer(input:string,evidence:Evidence[],dimensions:ReturnType<typeof reasonAcrossDimensions>):string { const safeEvidence=Array.isArray(evidence)?evidence:[]; const safeDimensions=Array.isArray(dimensions)?dimensions:[]; const dimensionalSummary=safeDimensions.length?` across ${safeDimensions.length} dimensional reasoning layers`:""; if(!safeEvidence.length)return`Fresh AI analyzed “${input}”${dimensionalSummary}, while preserving uncertainty where evidence is missing.`; return`Fresh AI evaluated ${safeEvidence.length} evidence item(s) for “${input}”${dimensionalSummary}.`; }
