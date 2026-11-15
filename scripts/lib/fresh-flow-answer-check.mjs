// What the production smoke test cares about: the endpoint answers from retrieved project knowledge, the answer is
// about Fresh Flow, and it names real media formats. It must not depend on one document's exact wording, because the
// knowledge base grows (the platform doctrine says "Short-form video", the architecture doc says "Fresh Short").

const FORMAT_FAMILIES = [
  ["short"],
  ["long-form", "long video", "long videos"],
  ["news", "posts"],
  ["podcast"],
  ["audio", "music"],
  ["ar", "vr", "ar/vr"],
  ["live"],
  ["image", "photo"],
];

function mentions(text, term) {
  if (term.length <= 3) return new RegExp(`(^|[^a-z])${term.replace("/", "\\/")}([^a-z]|$)`).test(text);
  return text.includes(term);
}

/** @returns {{ ok: true } | { ok: false, reason: string }} */
export function judgeFreshFlowAnswer(answer) {
  const text = typeof answer === "string" ? answer.trim().toLowerCase() : "";
  if (!text) return { ok: false, reason: "empty answer" };
  if (!text.includes("retrieved project documentation") && !text.includes("source-grounded")) return { ok: false, reason: "not marked as grounded in project documentation" };
  if (!text.includes("fresh flow")) return { ok: false, reason: "does not mention Fresh Flow" };
  const families = FORMAT_FAMILIES.filter((terms) => terms.some((t) => mentions(text, t))).length;
  if (families < 3) return { ok: false, reason: `names only ${families} media format families, expected at least 3` };
  return { ok: true };
}
