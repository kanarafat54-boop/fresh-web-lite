import type { FreshSkill } from "./FreshAIArchitecture";
import type { FreshSkillRegistry } from "./FreshAIKernel";

export class InMemoryFreshSkillRegistry implements FreshSkillRegistry {
  private readonly registry = new Map<string, FreshSkill>();

  register(skill: FreshSkill): void {
    this.registry.set(skill.id, skill);
  }

  find(capabilities: string[]): FreshSkill[] {
    return [...this.registry.values()].filter((skill) =>
      capabilities.some((capability) => skill.capabilities.includes(capability)),
    );
  }
}

export const CORE_FRESH_SKILLS: FreshSkill[] = [
  { id: "reasoning", name: "Native Reasoning", description: "General reasoning and decomposition", capabilities: ["general-reasoning", "planning"] },
  { id: "research", name: "Evidence Research", description: "Evidence and research synthesis", capabilities: ["research", "evidence-analysis"] },
  { id: "engineering", name: "Engineering", description: "Code, architecture and testing", capabilities: ["code-generation", "code-review", "testing"] },
  { id: "security", name: "Security Analysis", description: "Threat and vulnerability analysis", capabilities: ["security"] },
  { id: "mathematics", name: "Mathematical Reasoning", description: "Mathematical and statistical reasoning", capabilities: ["mathematics", "statistics"] },
  { id: "design", name: "Interface Design", description: "UI/UX and design-system reasoning", capabilities: ["ui-ux-design", "design-systems"] },
];

export function createCoreFreshSkillRegistry(): InMemoryFreshSkillRegistry {
  const registry = new InMemoryFreshSkillRegistry();
  CORE_FRESH_SKILLS.forEach((skill) => registry.register(skill));
  return registry;
}
