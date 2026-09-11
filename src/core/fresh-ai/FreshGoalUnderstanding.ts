/**
 * Fresh-owned goal understanding.
 *
 * This boundary is intentionally provider-independent. It produces an actionable
 * interpretation from the request and conversation without making an external
 * model the identity or decision-maker of Fresh AI. A trained fresh-unified-1
 * checkpoint can replace/augment the scorer behind this stable contract later.
 */
import type { FreshConversationTurn, FreshGoalInterpretation, FreshIntent } from "./FreshAIArchitecture.js";

const INTENTS: FreshIntent[] = ["chat", "answer", "research", "create", "code", "design", "analyze", "plan", "act", "learn", "discover"];
const patterns: Array<[FreshIntent, RegExp[]]> = [
  ["chat", [/^(hi|hello|hey|hiya|yo)\b/i, /\bhow are you\b/i, /\bcan we chat\b/i, /\bjust chatting\b/i]],
  ["research", [/\bresearch\b/i, /\binvestigate\b/i, /\bfact[- ]?check\b/i, /\bverify\b/i, /\bsources?\b/i, /\bevidence\b/i, /\bcitation\b/i, /\baccording to\b/i]],
  ["code", [/\b(code|coding|program|programming|debug|debugging|refactor|implement|compile|typescript|javascript|python|sql|api)\b/i, /\bfix (this|the) (bug|error)\b/i]],
  ["design", [/\b(ui|ux|interface|layout|wireframe|design system)\b/i, /\bdesign\b/i]],
  ["plan", [/\b(plan|planning|roadmap|strategy|steps|workflow)\b/i, /\bhow should (i|we)\b/i]],
  ["act", [/\b(send|post|publish|buy|pay|delete|change|update|book|schedule|execute|run|deploy)\b/i]],
  ["learn", [/\b(learn|teach|study|lesson|practice|explain to me)\b/i]],
  ["discover", [/\b(find|discover|recommend|show me|where can i)\b/i]],
  ["create", [/\b(create|write|draft|generate|make|build)\b/i]],
  ["analyze", [/\b(analy[sz]e|compare|why|explain|difference|evaluate|review)\b/i]],
];

function lastUserTurn(conversation: FreshConversationTurn[]): string {
  return [...conversation].reverse().find(turn => turn.role === "user")?.content ?? "";
}

function resolveFollowUp(input: string, conversation: FreshConversationTurn[]): { text: string; dependency: "none" | "conversation" } {
  const previous = lastUserTurn(conversation);
  const followUp = /^(and|also|then|what about|how about|why|what if|that|this|it|they|them|yes|no|okay|ok|continue|go on|do it|make it|fix it|change it)\b/i.test(input.trim());
  if (followUp && previous) return { text: `${previous}\nFollow-up: ${input.trim()}`, dependency: "conversation" };
  return { text: input.trim(), dependency: "none" };
}

function scoreIntent(text: string): FreshIntent {
  const scores = new Map<FreshIntent, number>(INTENTS.map(intent => [intent, 0]));
  for (const [intent, rules] of patterns) for (const rule of rules) if (rule.test(text)) scores.set(intent, (scores.get(intent) ?? 0) + 1);
  if (/^\s*(hi|hello|hey|hiya|yo|good morning|good afternoon|good evening)\b/i.test(text)) scores.set("chat", 100);
  if (/\bwhat (can|do) you do\b|\bwhat(?:'s| is) your (ability|capabilit(?:y|ies))\b|\byour (abilities|capabilities)\b/i.test(text)) return "answer";
  let best: FreshIntent = "answer";
  let bestScore = 0;
  for (const intent of INTENTS) {
    const score = scores.get(intent) ?? 0;
    if (score > bestScore) { best = intent; bestScore = score; }
  }
  return best;
}

function entities(text: string): string[] {
  return [...new Set((text.match(/\b[A-Z][A-Za-z0-9_-]{2,}(?:\s+[A-Z][A-Za-z0-9_-]{2,})*/g) ?? []).slice(0, 12))];
}

function constraints(text: string): string[] {
  const value = text.toLowerCase();
  const result: string[] = [];
  if (/\b(brief|short|quick|concise)\b/.test(value)) result.push("be concise");
  if (/\b(step[- ]by[- ]step|steps)\b/.test(value)) result.push("show steps");
  if (/\b(beginner|simple|easy|eli5)\b/.test(value)) result.push("use accessible language");
  if (/\b(detailed|deep|comprehensive|thorough)\b/.test(value)) result.push("be comprehensive");
  if (/\b(no|without) (api|external|vendor)\b/.test(value)) result.push("do not depend on an external provider");
  return result;
}

export function understandFreshGoal(input: string, conversation: FreshConversationTurn[] = [], forcedIntent?: FreshIntent): FreshGoalInterpretation {
  const raw = input.trim();
  const resolved = resolveFollowUp(raw, conversation);
  const text = resolved.text;
  const value = text.toLowerCase();
  const conversational = /^(hi|hello|hey|hiya|yo|good morning|good afternoon|good evening|let'?s chat|talk to me|what'?s up|how are you|are you there)[.!?\s]*$/i.test(raw);
  const intent = forcedIntent ?? (conversational ? "chat" : scoreIntent(text));
  const needsAction = intent === "act";
  const needsEvidence = intent === "research" || /\b(latest|today|now|current|recent|source|sources|evidence|verify|fact[- ]?check|according to|citation|cite|proof)\b/i.test(value);
  const outputMode: FreshGoalInterpretation["outputMode"] = intent === "chat" ? "conversation" : intent === "research" ? "research" : intent === "create" ? "creation" : intent === "code" ? "code" : intent === "plan" ? "plan" : intent === "act" ? "action" : "answer";
  const objective = conversational ? "Have a natural conversation with the user." : raw;
  let desiredOutcome = "Directly satisfy the user's request.";
  if (needsAction) desiredOutcome = "Complete the requested action safely, or explain the approval/tool boundary.";
  else if (intent === "research") desiredOutcome = "Provide an evidence-grounded answer with uncertainty preserved.";
  else if (intent === "create") desiredOutcome = "Produce the requested artifact or draft.";
  else if (intent === "code") desiredOutcome = "Provide or implement a correct technical solution.";
  else if (intent === "plan") desiredOutcome = "Turn the goal into clear, executable steps.";
  else if (intent === "chat") desiredOutcome = "Reply naturally and helpfully without forcing a workflow.";
  return {
    intent,
    objective,
    desiredOutcome,
    outputMode,
    needsEvidence,
    needsAction,
    needsClarification: !conversational && raw.length < 4,
    constraints: constraints(raw),
    entities: entities(raw),
    contextDependency: resolved.dependency,
  };
}
