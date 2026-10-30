/**
 * Fresh Astra — governed perception, reasoning, planning and action coordinator.
 *
 * Astra coordinates Fresh-owned capabilities; it is not a model and does not
 * pretend that untrained modalities or unavailable tools are executable.
 */
import { getAstraModalityReadiness, type AstraModalityEngine } from "./astra/AstraRuntime.ts";

export type AstraModuleId =
  | "language" | "vision" | "audio" | "video" | "spatial"
  | "research" | "code" | "automation" | "robotics"
  | "science" | "world-model" | "space" | "energy" | "economy" | "learning";

export type AstraReadiness = "available" | "contracted" | "training-required" | "in-development";
export type AstraRisk = "none" | "low" | "moderate" | "high" | "physical";
export type AstraOperatingMode = "personal-intelligence" | "universal-infrastructure";

export type FreshAstraCoordination = {
  id: "fresh-astra";
  version: "0.2.0";
  mission: "personal-and-universal-intelligence";
  operatingModes: AstraOperatingMode[];
  objective: string;
  modules: Array<{ id: AstraModuleId; readiness: AstraReadiness; reason: string }>;
  risk: AstraRisk;
  approvalRequired: boolean;
  executionAllowed: false;
  policy: "observe-plan-verify";
  modalityRuntime: AstraModalityEngine[];
  simulation: { mode: "software-in-the-loop"; physicalControl: false; physicsValidated: false };
  limitations: string[];
};

const MODULE_STATUS: Record<AstraModuleId, { readiness: AstraReadiness; reason: string }> = {
  language: { readiness: "training-required", reason: "Fresh Unified inference is not yet promoted for production serving." },
  vision: { readiness: "contracted", reason: "Native visual perception is not yet verified end to end." },
  audio: { readiness: "contracted", reason: "Native speech perception and generation are not yet verified end to end." },
  video: { readiness: "in-development", reason: "Temporal understanding and native video generation are not production-ready." },
  spatial: { readiness: "contracted", reason: "Spatial and 3D perception require their own trained and evaluated runtime." },
  research: { readiness: "available", reason: "Fresh research and evidence retrieval boundaries are present." },
  code: { readiness: "available", reason: "Fresh code reasoning and repository engineering boundaries are present; execution remains separately governed." },
  automation: { readiness: "contracted", reason: "Registered automation tools and scoped execution are not yet fully available." },
  robotics: { readiness: "contracted", reason: "Robotics is simulation-first; no physical robot control is certified." },
  science: { readiness: "in-development", reason: "Scientific discovery requires reproducible experiments, domain review and validated Fresh-owned models." },
  "world-model": { readiness: "in-development", reason: "World simulation and digital-twin capabilities are not yet validated against live, authoritative data." },
  space: { readiness: "in-development", reason: "Space intelligence is a research target; no operational mission-control capability is available." },
  energy: { readiness: "in-development", reason: "Energy optimisation requires validated grid/device models and operator-approved integrations." },
  economy: { readiness: "in-development", reason: "Economic and business automation requires verified data, scoped permissions and accountable human approval." },
  learning: { readiness: "in-development", reason: "Personalised learning requires evaluated curricula, progress measurement and learner-controlled memory." },
};

function requestedModules(input: string): AstraModuleId[] {
  const value = input.toLowerCase();
  const selected = new Set<AstraModuleId>(["language"]);
  if (/image|photo|picture|camera|visual|screenshot|document scan/.test(value)) selected.add("vision");
  if (/voice|audio|speech|speak|listen|sound|music/.test(value)) selected.add("audio");
  if (/video|film|movie|clip|frame|scene/.test(value)) { selected.add("video"); selected.add("vision"); }
  if (/3d|spatial|geometry|scene|object position/.test(value)) selected.add("spatial");
  if (/research|source|evidence|latest|current|news|investigat/.test(value)) selected.add("research");
  if (/code|program|repository|repo|debug|implement|build|software/.test(value)) selected.add("code");
  if (/automate|automation|workflow|computer|application|browser/.test(value)) selected.add("automation");
  if (/robot|machine|actuator|drone|vehicle|motor|physical device|harvest|irrigat/.test(value)) selected.add("robotics");
  if (/scientific|science|experiment|hypothes|drug discovery|material discovery|laboratory/.test(value)) selected.add("science");
  if (/simulate|simulation|digital twin|world model|predict consequence|infrastructure model/.test(value)) selected.add("world-model");
  if (/space|satellite|orbit|astronomy|rocket/.test(value)) selected.add("space");
  if (/energy|electricity|power grid|battery|solar grid/.test(value)) selected.add("energy");
  if (/business|company|economy|market|financial workflow|start a business/.test(value)) selected.add("economy");
  if (/learn|teach|education|tutor|study|training plan/.test(value)) selected.add("learning");
  return [...selected];
}

function classifyRisk(input: string): AstraRisk {
  const value = input.toLowerCase();
  if (/robot|machine|actuator|drone|vehicle|motor|physical device|move .*arm|irrigat|harvest/.test(value)) return "physical";
  if (/delete|pay|purchase|transfer|publish|send|deploy|change permission|account recovery|place order/.test(value)) return "high";
  if (/install|modify|edit|update|run|execute|automate/.test(value)) return "moderate";
  if (/create|write|design|generate|simulate|research|learn/.test(value)) return "low";
  return "none";
}

export function coordinateFreshAstra(input: string): FreshAstraCoordination {
  const objective = input.trim();
  const ids = requestedModules(objective);
  const risk = classifyRisk(objective);
  const modules = ids.map((id) => ({ id, ...MODULE_STATUS[id] }));
  const modalityRuntime = getAstraModalityReadiness();
  const limitations = modules
    .filter((module) => module.readiness !== "available")
    .map((module) => `${module.id}: ${module.reason}`);
  for (const runtime of modalityRuntime) {
    if (runtime.state !== "ready") limitations.push(`${runtime.modality} runtime: ${runtime.note}`);
  }
  if (risk === "physical") limitations.push("Physical actuation is blocked: Astra is observation/planning only until a named machine passes simulation, hardware-in-loop and supervised safety gates.");
  if (risk === "high") limitations.push("High-impact actions require explicit scoped approval and independent verification.");
  return {
    id: "fresh-astra",
    version: "0.2.0",
    mission: "personal-and-universal-intelligence",
    operatingModes: ["personal-intelligence", "universal-infrastructure"],
    objective,
    modules,
    risk,
    approvalRequired: risk === "high" || risk === "physical",
    executionAllowed: false,
    policy: "observe-plan-verify",
    modalityRuntime,
    simulation: { mode: "software-in-the-loop", physicalControl: false, physicsValidated: false },
    limitations,
  };
}

export function assertFreshAstraIntegrity(): void {
  const ids = Object.keys(MODULE_STATUS);
  if (new Set(ids).size !== ids.length) throw new Error("Astra module registry contains duplicate identifiers");
  if (MODULE_STATUS.robotics.readiness === "available") throw new Error("Astra cannot expose robotics as available without a certified controller");
  if (MODULE_STATUS.science.readiness === "available" || MODULE_STATUS["world-model"].readiness === "available") {
    throw new Error("Research-grade science and world simulation require independent validation before availability");
  }
}
