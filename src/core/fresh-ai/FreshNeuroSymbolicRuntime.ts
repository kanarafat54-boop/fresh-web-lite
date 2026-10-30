/**
 * Fresh Neuro-Symbolic Runtime — deterministic, provider-independent backend.
 *
 * This is an executable symbolic subsystem, not a language-model claim.
 * It extracts only explicit propositional rules/facts and simple numeric
 * constraints from the user's supplied text. It never upgrades a causal
 * hypothesis into an established fact.
 */

export type FreshSymbolicFact = { id: string; proposition: string; polarity: "positive" | "negative"; source: "explicit-input" | "rule-inference" };
export type FreshSymbolicContradiction = { kind: "proposition" | "numeric-constraint"; subject: string; detail: string };
export type FreshCausalHypothesis = { cause: string; effect: string; epistemicStatus: "hypothesis-only"; source: "explicit-input" };
export type FreshSymbolicAnalysis = {
  backend: "fresh-symbolic-rules-v1";
  status: "executed";
  facts: FreshSymbolicFact[];
  inferredFacts: FreshSymbolicFact[];
  contradictions: FreshSymbolicContradiction[];
  causalHypotheses: FreshCausalHypothesis[];
  unresolvedRules: Array<{ antecedent: string; consequent: string }>;
  checks: { rulesParsed: number; factsParsed: number; constraintsParsed: number; contradictionsFound: number };
};

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}_\s.-]/gu, " ").replace(/\s+/g, " ").trim();
const proposition = (value: string) => normalize(value).replace(/^(?:that|the fact that)\s+/, "").replace(/[.?!]+$/, "").trim();

type NumericConstraint = { variable: string; operator: ">" | ">=" | "<" | "<=" | "="; value: number };

function parseNumericConstraints(input: string): NumericConstraint[] {
  const constraints: NumericConstraint[] = [];
  const pattern = /\b([a-z][a-z0-9_]*)\s*(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)\b/gi;
  for (const match of input.matchAll(pattern)) {
    const variable = normalize(match[1] ?? "");
    const operator = match[2] as NumericConstraint["operator"];
    const value = Number(match[3]);
    if (variable && Number.isFinite(value)) constraints.push({ variable, operator, value });
  }
  return constraints;
}

function findNumericContradictions(items: NumericConstraint[]): FreshSymbolicContradiction[] {
  const groups = new Map<string, NumericConstraint[]>();
  for (const item of items) groups.set(item.variable, [...(groups.get(item.variable) ?? []), item]);
  const contradictions: FreshSymbolicContradiction[] = [];
  for (const [variable, values] of groups) {
    const equalities = values.filter((item) => item.operator === "=");
    const lower = values.filter((item) => item.operator === ">" || item.operator === ">=").reduce<NumericConstraint | undefined>((best, item) => !best || item.value > best.value || (item.value === best.value && item.operator === ">") ? item : best, undefined);
    const upper = values.filter((item) => item.operator === "<" || item.operator === "<=").reduce<NumericConstraint | undefined>((best, item) => !best || item.value < best.value || (item.value === best.value && item.operator === "<") ? item : best, undefined);
    const equalityValues = new Set(equalities.map((item) => item.value));
    if (equalityValues.size > 1) contradictions.push({ kind: "numeric-constraint", subject: variable, detail: `Conflicting equality constraints for ${variable}: ${[...equalityValues].join(" and ")}.` });
    const equal = equalities[0]?.value;
    if (equal !== undefined && ((lower && (equal < lower.value || (equal === lower.value && lower.operator === ">"))) || (upper && (equal > upper.value || (equal === upper.value && upper.operator === "<"))))) {
      contradictions.push({ kind: "numeric-constraint", subject: variable, detail: `Equality ${variable} = ${equal} violates a supplied bound.` });
    }
    if (lower && upper && (lower.value > upper.value || (lower.value === upper.value && (lower.operator === ">" || upper.operator === "<")))) {
      contradictions.push({ kind: "numeric-constraint", subject: variable, detail: `Lower and upper bounds for ${variable} cannot both hold.` });
    }
  }
  return contradictions;
}

export function runFreshNeuroSymbolicAnalysis(input: string): FreshSymbolicAnalysis {
  const text = typeof input === "string" ? input.slice(0, 12000) : "";
  const rules: Array<{ antecedent: string; consequent: string }> = [];
  const rulePattern = /\bif\s+([^.!?;]{2,180}?)\s*,?\s+then\s+([^.!?;]{2,180})/gi;
  for (const match of text.matchAll(rulePattern)) {
    const antecedent = proposition(match[1] ?? "");
    const consequent = proposition(match[2] ?? "");
    if (antecedent && consequent) rules.push({ antecedent, consequent });
  }

  const facts: FreshSymbolicFact[] = [];
  const seen = new Set<string>();
  const addFact = (value: string, polarity: "positive" | "negative", source: FreshSymbolicFact["source"]) => {
    const normalized = proposition(value);
    if (!normalized) return;
    const key = polarity + ":" + normalized;
    if (seen.has(key)) return;
    seen.add(key);
    facts.push({ id: `symbolic-${facts.length + 1}`, proposition: normalized, polarity, source });
  };

  const factPattern = /\b(it is true that|true that|fact:|known:)\s*([^.!?;]{2,180})/gi;
  for (const match of text.matchAll(factPattern)) addFact(match[2] ?? "", "positive", "explicit-input");
  const negativePattern = /\b(it is false that|false that|not true that|not:)\s*([^.!?;]{2,180})/gi;
  for (const match of text.matchAll(negativePattern)) addFact(match[2] ?? "", "negative", "explicit-input");

  const inferredFacts: FreshSymbolicFact[] = [];
  const knownPositive = new Set(facts.filter((fact) => fact.polarity === "positive").map((fact) => fact.proposition));
  // Bounded forward chaining supports multi-step rule composition without an unbounded proof search.
  for (let pass = 0; pass < 32 && inferredFacts.length < 256; pass += 1) {
    let changed = false;
    for (const rule of rules) {
      if (knownPositive.has(rule.antecedent) && !knownPositive.has(rule.consequent)) {
        knownPositive.add(rule.consequent);
        inferredFacts.push({ id: `inferred-${inferredFacts.length + 1}`, proposition: rule.consequent, polarity: "positive", source: "rule-inference" });
        changed = true;
      }
    }
    if (!changed) break;
  }
  const unresolvedRules = rules.filter((rule) => !knownPositive.has(rule.antecedent));

  const contradictions: FreshSymbolicContradiction[] = [];
  for (const fact of facts) {
    const opposite = facts.find((other) => other.proposition === fact.proposition && other.polarity !== fact.polarity);
    if (opposite) contradictions.push({ kind: "proposition", subject: fact.proposition, detail: `The input explicitly marks "${fact.proposition}" both true and false.` });
  }
  for (const inferred of inferredFacts) {
    if (facts.some((fact) => fact.proposition === inferred.proposition && fact.polarity === "negative")) {
      contradictions.push({ kind: "proposition", subject: inferred.proposition, detail: `A supplied rule infers "${inferred.proposition}" while the input explicitly marks it false.` });
    }
  }
  const numeric = parseNumericConstraints(text);
  contradictions.push(...findNumericContradictions(numeric));

  const causalHypotheses: FreshCausalHypothesis[] = [];
  const causalPattern = /\b([a-z][a-z0-9 _-]{1,70}?)\s+(?:causes|caused|leads to|results in)\s+([a-z][a-z0-9 _-]{1,70}?)(?=[.!?;]|$)/gi;
  for (const match of text.matchAll(causalPattern)) {
    const cause = proposition(match[1] ?? "");
    const effect = proposition(match[2] ?? "");
    if (cause && effect) causalHypotheses.push({ cause, effect, epistemicStatus: "hypothesis-only", source: "explicit-input" });
  }

  return {
    backend: "fresh-symbolic-rules-v1",
    status: "executed",
    facts,
    inferredFacts,
    contradictions,
    causalHypotheses,
    unresolvedRules,
    checks: { rulesParsed: rules.length, factsParsed: facts.length, constraintsParsed: numeric.length, contradictionsFound: contradictions.length },
  };
}

export function assertFreshNeuroSymbolicRuntimeIntegrity(): void {
  const result = runFreshNeuroSymbolicAnalysis("Fact: rain is present. If rain is present, then roads are wet. x > 10 and x < 5. smoke causes coughing.");
  if (result.backend !== "fresh-symbolic-rules-v1" || result.status !== "executed") throw new Error("Fresh symbolic backend did not execute.");
  if (!result.inferredFacts.some((fact) => fact.proposition === "roads are wet")) throw new Error("Fresh symbolic rule inference failed.");
  if (!result.contradictions.some((item) => item.kind === "numeric-constraint")) throw new Error("Fresh symbolic numeric contradiction check failed.");
  if (!result.causalHypotheses.every((item) => item.epistemicStatus === "hypothesis-only")) throw new Error("Causal hypotheses must not be promoted to facts.");
}
assertFreshNeuroSymbolicRuntimeIntegrity();
