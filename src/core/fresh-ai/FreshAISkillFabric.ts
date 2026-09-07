import type { FreshSkill } from "./FreshAIArchitecture.js";
import type { FreshSkillRegistry } from "./FreshAIKernel.js";

export class InMemoryFreshSkillRegistry implements FreshSkillRegistry {
  private readonly registry = new Map<string, FreshSkill>();

  register(skill: FreshSkill): void { this.registry.set(skill.id, skill); }
  find(capabilities:string[]):FreshSkill[] {
    const wanted=new Set(capabilities);
    return [...this.registry.values()].filter((skill)=>skill.capabilities.some((capability)=>wanted.has(capability)));
  }
}

export const CORE_FRESH_SKILLS: FreshSkill[] = [
  { id:"reasoning", name:"Native Reasoning", description:"General reasoning, decomposition, uncertainty and planning", capabilities:["general-reasoning","deduction","induction","abduction","planning","constraint-solving","confidence-calibration","unknown-detection","metacognition"] },
  { id:"research", name:"Evidence Research", description:"Evidence retrieval, synthesis and scientific discovery", capabilities:["research","evidence-analysis","provenance","scientific-discovery","forecasting","data-analysis"] },
  { id:"engineering", name:"Engineering", description:"Code, architecture, APIs, databases, testing and optimization", capabilities:["code-generation","code-review","debugging","refactoring","architecture","database-design","api-design","testing","optimization"] },
  { id:"security", name:"Security Analysis", description:"Threat, privacy, integrity and risk analysis", capabilities:["security","risk-analysis","contradiction-detection"] },
  { id:"mathematics", name:"Mathematical Reasoning", description:"Mathematical, statistical and formal reasoning", capabilities:["mathematics","statistics","causal-reasoning","counterfactual-reasoning"] },
  { id:"design", name:"Interface Design", description:"UI/UX, design systems and creative synthesis", capabilities:["ui-ux-design","design-systems","creative-synthesis"] },
  { id:"strategy", name:"Strategic Intelligence", description:"Long-horizon planning, scenario analysis and mission reasoning", capabilities:["strategic-planning","simulation-planning","counterfactual-reasoning","environment-modeling"] },
  { id:"learning", name:"Transfer Learning", description:"Learning, teaching and transfer of abstractions across domains", capabilities:["learning","transfer-learning"] },
  { id:"media", name:"Media Intelligence", description:"Audio, video, image and multimodal understanding", capabilities:["media-understanding","video-intelligence","audio-understanding"] },
  { id:"communication", name:"Communication", description:"Writing, translation and socially aware communication", capabilities:["writing","translation","social-context"] },
  { id:"automation", name:"Action Planning", description:"Safe automation and environment-aware action planning", capabilities:["automation","environment-modeling"] },
  { id:"self-improvement", name:"Self Evaluation", description:"Metacognition and governed improvement proposals", capabilities:["metacognition","self-improvement","confidence-calibration"] },
];

export function createCoreFreshSkillRegistry():InMemoryFreshSkillRegistry { const registry=new InMemoryFreshSkillRegistry(); CORE_FRESH_SKILLS.forEach((skill)=>registry.register(skill)); return registry; }
