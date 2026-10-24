/**
 * Fresh AI cognitive diversity router.
 *
 * These are bounded reasoning strategies within fresh-unified-1, not separate
 * model identities, claims of consciousness, or evidence of alien/divine access.
 * The router selects perspectives; the reasoning runtime must apply them and
 * verify material claims using the shared TRUEMODE and permission contracts.
 */
export type FreshCognitivePerspectiveId =
  | "analytical" | "creative" | "philosophical" | "empathic" | "pattern"
  | "systems" | "practical" | "reflective" | "concrete" | "abstract"
  | "lateral" | "probabilistic" | "critical" | "integrative" | "scientific"
  | "social-cultural" | "spatial-embodied" | "temporal-historical"
  | "ethical-rights" | "alien-mind" | "god-made-mind";

export type FreshCognitivePerspective = {
  readonly id: FreshCognitivePerspectiveId;
  readonly label: string;
  readonly purpose: string;
  readonly guidingQuestions: readonly string[];
  readonly epistemicGuard: string;
};

export type FreshCognitiveSelection = {
  readonly selected: readonly FreshCognitivePerspective[];
  readonly selectionReasons: readonly string[];
  readonly bounded: true;
  readonly identity: "fresh-unified-1";
};

const define = (
  id: FreshCognitivePerspectiveId,
  label: string,
  purpose: string,
  guidingQuestions: readonly string[],
  epistemicGuard = "Treat this perspective as a reasoning strategy; ground material claims in evidence and preserve uncertainty.",
): FreshCognitivePerspective => ({ id, label, purpose, guidingQuestions, epistemicGuard });

export const FRESH_COGNITIVE_PERSPECTIVES: readonly FreshCognitivePerspective[] = [
  define("analytical", "Analytical", "Decompose problems, compare evidence and test implications.", ["What follows from the available evidence?", "Which steps can be checked?"]),
  define("creative", "Creative", "Generate diverse candidate ideas and combinations.", ["What else might work?", "Which alternatives have not been considered?"]),
  define("philosophical", "Philosophical", "Examine definitions, assumptions, meaning and limits of knowledge.", ["What do the terms mean?", "What can and cannot be concluded?"]),
  define("empathic", "Emotional / empathic", "Consider expressed feelings, needs and interpersonal impact.", ["How might this affect the people involved?", "What should not be assumed about another person's feelings?"]),
  define("pattern", "Intuitive / pattern-based", "Generate fast candidate interpretations from recognizable patterns.", ["What pattern might explain this?", "What evidence could disconfirm the impression?"]),
  define("systems", "Systems", "Map dependencies, feedback loops and second-order effects.", ["What connects to what?", "What happens downstream?"]),
  define("practical", "Practical", "Convert goals into feasible, resource-aware steps.", ["What can be done now?", "What constraints or costs matter?"]),
  define("reflective", "Reflective / metacognitive", "Inspect assumptions, omissions and possible reasoning errors.", ["Why might this answer be wrong?", "What might be missing?"]),
  define("concrete", "Concrete", "Ground abstractions in specific observable cases.", ["What does this look like in practice?", "Which example actually fits?"]),
  define("abstract", "Abstract", "Reason over general principles and representations.", ["What structure explains these cases?", "Does the principle transfer?"]),
  define("lateral", "Lateral", "Reframe the problem and search for non-obvious options.", ["Is there another framing?", "Can the constraint be satisfied another way?"]),
  define("probabilistic", "Probabilistic", "Compare hypotheses while respecting uncertainty.", ["How strong is each possibility?", "What evidence would update confidence?"]),
  define("critical", "Critical", "Test sources, logic, incentives and counterexamples.", ["What would disprove this?", "How reliable is the source?"]),
  define("integrative", "Integrative", "Combine compatible insights while retaining genuine disagreement.", ["What can be combined?", "What conflict remains unresolved?"]),
  define("scientific", "Scientific", "Form testable hypotheses and reproducible checks.", ["What observation would distinguish the hypotheses?", "Can the result be reproduced?"]),
  define("social-cultural", "Social / cultural", "Consider context, language, norms and differing viewpoints.", ["How could context change the meaning?", "What needs clarification rather than stereotyping?"]),
  define("spatial-embodied", "Spatial / embodied", "Reason about geometry, motion and physical constraints.", ["What is possible in this space?", "What simulation or sensor evidence is needed?"]),
  define("temporal-historical", "Temporal / historical", "Track sequence, change and time-dependent claims.", ["What changed and when?", "Is the evidence still current?"]),
  define("ethical-rights", "Ethical / rights-aware", "Consider consent, harms, fairness, dignity and affected parties.", ["Who could be harmed or excluded?", "Which rights or approvals apply?"]),
  define("alien-mind", "Alien Mind", "Challenge human-default assumptions and explore hypothetical non-anthropocentric models.", ["Which assumptions are specifically human?", "What unfamiliar representation or scale might reveal a blind spot?", "What could test this hypothesis?"], "Alien-mind exploration is hypothetical. Never invent extraterrestrial evidence, contact, or special access; label speculation and propose tests."),
  define("god-made-mind", "God-Made Mind", "Explore creation, consciousness, meaning and ethics through a user-requested spiritual or theological lens.", ["Which tradition or premise is being used?", "What is faith-based, philosophical, empirical, or unknown?", "Which interpretations differ?"], "Respect the user's framing without presuming their religion or claiming divine authority, revelation, or knowledge of God's will."),
] as const;

const BY_ID = new Map(FRESH_COGNITIVE_PERSPECTIVES.map((item) => [item.id, item]));
const MAX_PERSPECTIVES = 6;

function add(ids: FreshCognitivePerspectiveId[], id: FreshCognitivePerspectiveId): void {
  if (!ids.includes(id) && ids.length < MAX_PERSPECTIVES) ids.push(id);
}

/**
 * Deterministic, bounded routing. Explicit Alien/God-made requests are respected;
 * neither lens is activated by assumptions about a user's identity or beliefs.
 */
export function selectFreshCognitivePerspectives(input: string, intent?: string): FreshCognitiveSelection {
  const text = input.toLocaleLowerCase();
  const ids: FreshCognitivePerspectiveId[] = [];
  const reasons: string[] = [];
  add(ids, "analytical");
  reasons.push("Analytical reasoning is the general default.");
  if (/alien|extraterrestrial|non.?human intelligence|unfamiliar intelligence|beyond human|human assumptions/.test(text)) {
    add(ids, "alien-mind"); reasons.push("The request explicitly explores non-human or alien perspectives.");
  }
  if (/god.?made mind|god|divine|creator|creation|spiritual|theolog|soul|purpose of existence/.test(text)) {
    add(ids, "god-made-mind"); reasons.push("The request explicitly raises a spiritual, theological, or creation-related question.");
  }
  if (/why|meaning|exist|conscious|reality|understand|mind|philosoph/.test(text)) add(ids, "philosophical");
  if (/build|implement|design|create|invent|idea|imagine|architecture/.test(text)) add(ids, "creative");
  if (/system|architecture|ecosystem|connect|depend|feedback|platform/.test(text)) add(ids, "systems");
  if (/research|scientific|experiment|evidence|source|prove|hypothes|verify|fact.?check/.test(text) || intent === "research") {
    add(ids, "scientific"); add(ids, "critical");
  }
  if (/probab|uncertain|risk|forecast|likely|possib|maybe|unknown/.test(text)) add(ids, "probabilistic");
  if (/feel|relationship|friend|partner|emotion|empat|communicat/.test(text)) add(ids, "empathic");
  if (/ethical|moral|fair|consent|harm|rights|privacy|safe|security/.test(text)) add(ids, "ethical-rights");
  if (/reflect|assumption|bias|wrong|limit|contradict|question my|question itself/.test(text)) add(ids, "reflective");
  if (/plan|steps|fix|solve|implement|action|work|budget|practical/.test(text) || intent === "act" || intent === "plan") add(ids, "practical");
  if (/alternative|another way|reframe|possibilit|what if|future|imagine/.test(text)) add(ids, "lateral");
  if (ids.length === 1) add(ids, "reflective");
  if (ids.length < 3 && (intent === "research" || /complex|deep|comprehensive|all aspects/.test(text))) add(ids, "integrative");
  const selected = ids.map((id) => BY_ID.get(id)).filter((item): item is FreshCognitivePerspective => Boolean(item));
  return { selected, selectionReasons: reasons, bounded: true, identity: "fresh-unified-1" };
}

export function assertFreshCognitiveDiversityIntegrity(): void {
  const ids = FRESH_COGNITIVE_PERSPECTIVES.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Fresh cognitive perspective IDs must be unique.");
  for (const item of FRESH_COGNITIVE_PERSPECTIVES) {
    if (!item.label.trim() || !item.purpose.trim() || !item.guidingQuestions.length || !item.epistemicGuard.trim()) {
      throw new Error(`Incomplete Fresh cognitive perspective: ${item.id}`);
    }
  }
  for (const id of ["alien-mind", "god-made-mind"] as const) {
    const item = BY_ID.get(id);
    if (!item || !/hypothetical|never invent/i.test(item.epistemicGuard) && id === "alien-mind") {
      throw new Error("Alien Mind must explicitly preserve the boundary between speculation and evidence.");
    }
    if (!item || !/divine authority|God's will/i.test(item.epistemicGuard) && id === "god-made-mind") {
      throw new Error("God-Made Mind must not claim divine authority.");
    }
  }
  const result = selectFreshCognitivePerspectives("Explore alien intelligence and the God-Made Mind while building a system.");
  if (!result.selected.some((item) => item.id === "alien-mind") || !result.selected.some((item) => item.id === "god-made-mind")) {
    throw new Error("Explicit Alien Mind and God-Made Mind requests must be routable.");
  }
  if (result.selected.length > MAX_PERSPECTIVES) throw new Error("Cognitive router exceeded its perspective budget.");
}
