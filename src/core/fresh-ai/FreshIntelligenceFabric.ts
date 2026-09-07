import { FRESH_AI_AGENTS, FRESH_AI_NATIVE_CAPABILITIES } from "./FreshAIArchitecture";
import { createCoreFreshSkillRegistry } from "./FreshAISkillFabric";
import { toolRegistry } from "../ara6/toolRegistry";
import type { FreshSkill } from "./FreshAIArchitecture";

export type FreshCapabilityStatus = "native" | "connected" | "planned";

export type FreshCapability = {
  id: string;
  status: FreshCapabilityStatus;
  skills: string[];
  tools: string[];
  agents: string[];
};

/**
 * Single capability view for Fresh Intelligence.
 *
 * Fresh AI remains the decision/reasoning boundary. ARA6 contributes
 * operational tools and agents; it does not become a second reasoning brain.
 * This fabric is intentionally metadata-only: side effects still require an
 * explicit executor and authorization gate.
 */
export function createFreshIntelligenceFabric(): FreshCapability[] {
  const skills = createCoreFreshSkillRegistry();
  const araTools = toolRegistry.list().filter((tool) => tool.enabled);

  return FRESH_AI_NATIVE_CAPABILITIES.map((id) => {
    const matchingSkills = skills.find([id]).map((skill: FreshSkill) => skill.id);
    const matchingTools = araTools
      .filter((tool) => tool.id === id || tool.category === id || tool.description.toLowerCase().includes(id.replace(/-/g, " ")))
      .map((tool) => tool.id);

    const agents = FRESH_AI_AGENTS.filter((agent) =>
      id.includes(agent) ||
      (agent === "research" && id === "research") ||
      (agent === "security" && id === "security") ||
      (agent === "testing" && id === "testing"),
    );

    return {
      id,
      status: matchingSkills.length || matchingTools.length || agents.length ? "connected" : "planned",
      skills: matchingSkills,
      tools: matchingTools,
      agents,
    };
  });
}

export function getFreshCapability(id: string): FreshCapability | undefined {
  return createFreshIntelligenceFabric().find((capability) => capability.id === id);
}
