/**
 * Fresh AI Cognitive Mind Fabric.
 *
 * This module plans which cognitive strategies should be composed for a request.
 * It does not create separate minds, prove consciousness, or imply trained model
 * capabilities. Strategy selection is advisory and remains inside the canonical
 * Fresh AI gateway, evidence, permission, verification, and governance boundaries.
 */

export const FRESH_AI_COGNITIVE_MODES = [
  "analytical", "creative", "philosophical", "emotional", "intuitive", "systems",
  "practical", "reflective", "concrete", "abstract", "linear", "lateral",
  "probabilistic", "critical", "open-minded", "integrative", "memory-retrieval",
  "perceptual-multimodal", "language-communication", "executive-planning",
  "alien-mind-exploration",
] as const;

export type FreshAICognitiveModeId = (typeof FRESH_AI_COGNITIVE_MODES)[number];
export type FreshAICognitiveProfileId = "godmade-stewardship";

export type FreshAICognitiveMode = {
  readonly id: FreshAICognitiveModeId;
  readonly label: string;
  readonly purpose: string;
  readonly status: "implemented-strategy" | "research-only";
};

export type FreshAICognitiveMindPlan = {
  readonly modeIds: readonly FreshAICognitiveModeId[];
  readonly profileIds: readonly FreshAICognitiveProfileId[];
  readonly rationale: readonly string[];
  readonly limits: readonly string[];
};

export const FRESH_AI_COGNITIVE_MODE_CATALOG: readonly FreshAICognitiveMode[] = [
  { id: "analytical", label: "Analytical", purpose: "Decompose problems and check relationships.", status: "implemented-strategy" },
  { id: "creative", label: "Creative", purpose: "Generate and compare alternative ideas.", status: "implemented-strategy" },
  { id: "philosophical", label: "Philosophical", purpose: "Clarify concepts, premises, and meaning.", status: "implemented-strategy" },
  { id: "emotional", label: "Emotional / empathetic", purpose: "Respond respectfully to stated feelings without mind-reading.", status: "implemented-strategy" },
  { id: "intuitive", label: "Intuitive / pattern-based", purpose: "Offer hypotheses that must be checked against evidence.", status: "implemented-strategy" },
  { id: "systems", label: "Systems", purpose: "Consider dependencies, feedback, and downstream effects.", status: "implemented-strategy" },
  { id: "practical", label: "Practical", purpose: "Translate goals into feasible next steps.", status: "implemented-strategy" },
  { id: "reflective", label: "Reflective / metacognitive", purpose: "Inspect assumptions, uncertainty, and possible errors.", status: "implemented-strategy" },
  { id: "concrete", label: "Concrete", purpose: "Ground explanations in examples and observable details.", status: "implemented-strategy" },
  { id: "abstract", label: "Abstract", purpose: "Use general models, symbols, and principles.", status: "implemented-strategy" },
  { id: "linear", label: "Linear", purpose: "Organize work into ordered steps and checkpoints.", status: "implemented-strategy" },
  { id: "lateral", label: "Lateral", purpose: "Reframe problems and explore less obvious alternatives.", status: "implemented-strategy" },
  { id: "probabilistic", label: "Probabilistic", purpose: "Represent uncertainty without false precision.", status: "implemented-strategy" },
  { id: "critical", label: "Critical", purpose: "Test claims, sources, and counterexamples.", status: "implemented-strategy" },
  { id: "open-minded", label: "Open-minded", purpose: "Compare alternatives and revise when evidence warrants it.", status: "implemented-strategy" },
  { id: "integrative", label: "Integrative", purpose: "Synthesize compatible insights while preserving unresolved conflicts.", status: "implemented-strategy" },
  { id: "memory-retrieval", label: "Memory and retrieval", purpose: "Use only authorized, relevant context with provenance.", status: "implemented-strategy" },
  { id: "perceptual-multimodal", label: "Perceptual / multimodal", purpose: "Route supplied media only to available modality handlers.", status: "implemented-strategy" },
  { id: "language-communication", label: "Language and communication", purpose: "Adapt explanations while preserving meaning.", status: "implemented-strategy" },
  { id: "executive-planning", label: "Executive planning", purpose: "Prioritize goals, budgets, checkpoints, and stop conditions.", status: "implemented-strategy" },
  { id: "alien-mind-exploration", label: "Alien Mind Lab", purpose: "Explore explicitly hypothetical non-human cognition models.", status: "research-only" },
] as const;

const BASE_MODES: readonly FreshAICognitiveModeId[] = [
  "analytical", "critical", "reflective", "integrative",
];

const RULES: readonly { pattern: RegExp; modes: readonly FreshAICognitiveModeId[]; rationale: string }[] = [
  { pattern: /create|invent|design|brainstorm|story|imagine|idea/i, modes: ["creative", "lateral", "abstract"], rationale: "Creative task: include divergent and abstract exploration." },
  { pattern: /feel|relationship|love|upset|sad|angry|emotion|message to/i, modes: ["emotional", "language-communication"], rationale: "Human communication: prioritize empathy and careful language." },
  { pattern: /system|architecture|ecosystem|complex|interact|dependenc|platform/i, modes: ["systems", "abstract", "integrative"], rationale: "Complex system: inspect dependencies and interactions." },
  { pattern: /plan|build|implement|fix|steps|roadmap|execute|project/i, modes: ["practical", "linear", "executive-planning"], rationale: "Action-oriented task: produce bounded steps and checkpoints." },
  { pattern: /research|latest|current|source|evidence|fact|verify|compare/i, modes: ["probabilistic", "open-minded", "memory-retrieval"], rationale: "Evidence-oriented task: track sources, alternatives, and uncertainty." },
  { pattern: /explain|example|beginner|simple|teach|learn/i, modes: ["concrete", "language-communication"], rationale: "Explanatory task: use grounded examples and clear language." },
  { pattern: /why|meaning|exist|conscious|mind|reality|philosoph/i, modes: ["philosophical", "abstract", "open-minded"], rationale: "Conceptual task: clarify assumptions and competing interpretations." },
  { pattern: /image|photo|picture|audio|voice|video|file|document|camera/i, modes: ["perceptual-multimodal"], rationale: "Media task: use modality handlers only when available." },
  { pattern: /alien mind|extraterrestrial|non-human cognition|unfamiliar intelligence/i, modes: ["alien-mind-exploration", "systems", "open-minded"], rationale: "Explicit request for hypothetical non-human cognition exploration." },
];

const LIMITS = [
  "Cognitive modes are software strategies, not proof of separate minds or consciousness.",
  "The Godmade AI profile means stewardship and humility principles; it does not imply divine origin, omniscience, or spiritual authority.",
  "Alien Mind Lab is hypothetical research; synthetic scenarios are not evidence of extraterrestrial intelligence.",
  "Evidence, privacy, safety, authorization, approval, and verification boundaries cannot be bypassed by a mode.",
  "A catalog entry does not prove that a tool, modality handler, or trained model is available.",
] as const;

export function resolveFreshAICognitiveMindPlan(input: string): FreshAICognitiveMindPlan {
  const text = input.trim();
  if (!text) throw new Error("Fresh AI cognitive planning requires a non-empty input");

  const selected = new Set<FreshAICognitiveModeId>(BASE_MODES);
  const rationale: string[] = ["Always include critical review, reflection, and synthesis as baseline strategies."];

  for (const rule of RULES) {
    if (!rule.pattern.test(text)) continue;
    for (const mode of rule.modes) selected.add(mode);
    rationale.push(rule.rationale);
  }

  // Every task gets the stewardship profile; alien-mind exploration is opt-in.
  return {
    modeIds: FRESH_AI_COGNITIVE_MODES.filter((id) => selected.has(id)),
    profileIds: ["godmade-stewardship"],
    rationale,
    limits: LIMITS,
  };
}

export function assertFreshAICognitiveMindFabricIntegrity(): void {
  const ids = FRESH_AI_COGNITIVE_MODE_CATALOG.map((mode) => mode.id);
  if (ids.length !== FRESH_AI_COGNITIVE_MODES.length) throw new Error("Cognitive mode catalog is incomplete");
  if (new Set(ids).size !== ids.length) throw new Error("Cognitive mode catalog contains duplicate IDs");
  for (const mode of FRESH_AI_COGNITIVE_MODE_CATALOG) {
    if (!mode.label.trim() || !mode.purpose.trim()) throw new Error(`Malformed cognitive mode: ${mode.id}`);
  }
  if (FRESH_AI_COGNITIVE_MODE_CATALOG.find((mode) => mode.id === "alien-mind-exploration")?.status !== "research-only") {
    throw new Error("Alien Mind Lab must remain explicitly research-only until validated");
  }
}
