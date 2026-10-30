/**
 * Honest execution/readiness map for Fresh AI terminology.
 *
 * This is runtime metadata, not a capability generator. A status is backed by
 * the named code path and must be downgraded when its dependency is unavailable.
 */
export type FreshAIBackendStatus = "active" | "wired" | "partial" | "training-required" | "research-only" | "hardware-required" | "approval-only";

export type FreshAIBackendReadiness = {
  id: string;
  term: string;
  status: FreshAIBackendStatus;
  backend: string;
  boundary: string;
};

export const FRESH_AI_BACKEND_READINESS: readonly FreshAIBackendReadiness[] = [
  { id: "ani", term: "Artificial Narrow Intelligence (ANI)", status: "partial", backend: "FreshAIKernel + registered native skills", boundary: "Capability-specific behavior only; no general-intelligence claim." },
  { id: "agi", term: "Artificial General Intelligence (AGI)", status: "research-only", backend: "Cross-domain benchmark and evaluation roadmap", boundary: "Not achieved; requires broad independent generalization evidence." },
  { id: "msi", term: "Machine Superintelligence (MSI; informal term)", status: "research-only", backend: "Research terminology only", boundary: "Not a standardized readiness level and not an achieved Fresh AI capability." },
  { id: "asi", term: "Artificial Superintelligence (ASI)", status: "research-only", backend: "asi.ts improvement-proposal evaluator", boundary: "Proposal substrate only; not superintelligence and cannot mutate production." },
  { id: "human-ai", term: "Human-AI collaboration", status: "active", backend: "FreshAIIntelligenceGateway approval + ARA6 role authorization", boundary: "Consequential actions remain approval- and permission-gated." },
  { id: "collective", term: "Collective / multi-agent intelligence", status: "wired", backend: "FreshARA6Bridge + agentRuntime + toolRegistry", boundary: "Only registered agents and enabled authorized tools can execute." },
  { id: "meta-intelligence", term: "Meta-intelligence / cognitive strategy selection", status: "wired", backend: "FreshAICognitiveDiversity + FreshAIKernel + Fresh Unified inference prompt", boundary: "Selects bounded reasoning strategies; model inference still requires a registered Fresh checkpoint." },
  { id: "cognitive-architecture", term: "Cognitive architecture", status: "active", backend: "FreshAIKernel understand/retrieve/reason/plan/verify pipeline", boundary: "A governed software architecture; not evidence of consciousness or a human-like mind." },
  { id: "recursive-improvement", term: "Recursive self-improvement", status: "approval-only", backend: "asi.ts improvement proposals + training promotion gates", boundary: "No autonomous production code, weight, policy or permission mutation." },
  { id: "agentic", term: "Agentic AI", status: "wired", backend: "FreshAIKernel plan/execute + FreshARA6Bridge", boundary: "Plans and executes only registered tools with TRUEMODE and authorization." },
  { id: "hierarchical-planning", term: "Hierarchical AI", status: "active", backend: "FreshAIKernel understand/reason/plan/verify pipeline", boundary: "Bounded task planning; not a learned hierarchical policy." },
  { id: "neuro-symbolic", term: "Neuro-symbolic AI", status: "active", backend: "FreshNeuroSymbolicRuntime", boundary: "Deterministic explicit-rule, fact-polarity and numeric-constraint checks; not unrestricted theorem proving." },
  { id: "world-models", term: "World models", status: "research-only", backend: "Astra architecture and simulation research", boundary: "No validated general-purpose learned world model is claimed." },
  { id: "mixture-of-experts", term: "Mixture of Experts (MoE)", status: "research-only", backend: "Fresh model architecture research", boundary: "No sparse expert checkpoint or serving router is currently registered." },
  { id: "continual-learning", term: "Continual learning", status: "training-required", backend: "FreshAITrainingPipeline + checkpoint promotion", boundary: "Offline governed training; no live automatic weight updates." },
  { id: "federated-learning", term: "Federated learning", status: "research-only", backend: "Privacy-preserving training research", boundary: "No device federation or secure aggregation deployment is claimed." },
  { id: "self-supervised", term: "Self-supervised learning", status: "training-required", backend: "FreshUnifiedModelTraining offline pipeline", boundary: "Requires authorized corpus, actual training run, evaluation and checkpoint registration." },
  { id: "nlp", term: "Natural language processing (NLP)", status: "training-required", backend: "fresh-unified-1 inference boundary", boundary: "The native checkpoint must be registered and ready before model-backed language inference is available." },
  { id: "computer-vision", term: "Computer vision", status: "training-required", backend: "Fresh vision modality contract", boundary: "Requires a verified Fresh-owned vision-capable checkpoint and image evaluation." },
  { id: "multimodal", term: "Multimodal AI", status: "training-required", backend: "FreshUnifiedModelInference modality boundary", boundary: "Each modality and cross-modal path requires trained weights and modality-specific evaluation." },
  { id: "generative", term: "Generative AI", status: "partial", backend: "Fresh native artifact contracts + Fresh generation services", boundary: "Only individually verified artifact engines may be described as operational." },
  { id: "predictive", term: "Predictive AI", status: "research-only", backend: "Forecasting and temporal evaluation track", boundary: "No production forecasting model is claimed by the symbolic runtime." },
  { id: "causal", term: "Causal AI", status: "research-only", backend: "FreshNeuroSymbolicRuntime causal-hypothesis extraction", boundary: "Extracted cause/effect wording remains a hypothesis; no causal identification is claimed." },
  { id: "scientific", term: "Scientific AI", status: "partial", backend: "Fresh research/evidence pipeline + deterministic computation skills", boundary: "Research assistance only; scientific discoveries require reproducibility and expert review." },
  { id: "embodied", term: "Embodied AI", status: "hardware-required", backend: "Astra simulation and future robotics control boundary", boundary: "No physical actuation until hardware-specific safety supervisor, emergency stop and human takeover are validated." },
  { id: "evolutionary", term: "Evolutionary AI", status: "research-only", backend: "Isolated evolutionary-search research", boundary: "Candidates cannot be promoted without independent evaluation and approval." },
  { id: "swarm", term: "Swarm intelligence", status: "research-only", backend: "Distributed-agent simulation research", boundary: "No live swarm deployment or uncontrolled agents." },
  { id: "self-organizing", term: "Self-organizing AI", status: "research-only", backend: "Adaptive orchestration research", boundary: "No self-reconfiguration of production services." },
  { id: "quantum", term: "Quantum AI", status: "research-only", backend: "Quantum/classical algorithm research", boundary: "No quantum hardware execution or quantum advantage is claimed." },
  { id: "neuromorphic", term: "Neuromorphic computing", status: "research-only", backend: "Event-driven hardware research", boundary: "No neuromorphic hardware backend is registered." },
] as const;

export function getFreshAIBackendReadiness(): FreshAIBackendReadiness[] {
  return FRESH_AI_BACKEND_READINESS.map((item) => ({ ...item }));
}

export function assertFreshAIBackendReadinessIntegrity(): void {
  const ids = FRESH_AI_BACKEND_READINESS.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Fresh AI backend readiness IDs must be unique.");
  for (const item of FRESH_AI_BACKEND_READINESS) {
    if (!item.term.trim() || !item.backend.trim() || !item.boundary.trim()) throw new Error(`Incomplete Fresh AI backend readiness entry: ${item.id}`);
  }
  const symbolic = FRESH_AI_BACKEND_READINESS.find((item) => item.id === "neuro-symbolic");
  if (symbolic?.status !== "active" || symbolic.backend !== "FreshNeuroSymbolicRuntime") throw new Error("The executable neuro-symbolic backend must remain accurately registered.");
  for (const id of ["agi", "asi", "mixture-of-experts", "quantum", "neuromorphic"]) {
    if (FRESH_AI_BACKEND_READINESS.find((item) => item.id === id)?.status !== "research-only") throw new Error(`${id} must not be presented as a production capability.`);
  }
}
assertFreshAIBackendReadinessIntegrity();
