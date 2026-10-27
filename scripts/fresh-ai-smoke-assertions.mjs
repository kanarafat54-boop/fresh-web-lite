// Pure evaluation of a /api/ai/ask response for the production smoke test.
// Contract (matches api/ai/ask.ts and FreshAIKernel): retrieval must be alive and grounded in platform
// knowledge. While the Fresh Unified model has no trained checkpoint, the answer is allowed to say that
// native inference is unavailable; it must never be empty, fabricated, or ungrounded.
export function evaluateAskPayload(payload, httpStatus = 200) {
  const problems = [];
  if (httpStatus < 200 || httpStatus > 299) problems.push(`HTTP ${httpStatus}: ${payload?.error ?? "request failed"}`);
  if (payload?.status !== "completed") problems.push(`status was ${payload?.status ?? "missing"}${payload?.error ? `: ${payload.error}` : ""}`);
  const answer = typeof payload?.answer === "string" ? payload.answer.trim() : "";
  if (!answer) problems.push("answer is empty");
  const evidenceText = (Array.isArray(payload?.evidence) ? payload.evidence : []).map((e) => `${e?.title ?? ""} ${e?.snippet ?? ""}`).join(" ").toLowerCase();
  const groundedEvidence = evidenceText.includes("shorts") && (evidenceText.includes("podcast") || evidenceText.includes("music"));
  if (!groundedEvidence) problems.push("retrieval returned no Fresh Flow platform knowledge (expected Shorts and podcasts/music evidence)");
  const lower = answer.toLowerCase();
  const answerGrounded = lower.includes("shorts") && (lower.includes("podcast") || lower.includes("music"));
  const inferenceReady = payload?.inference?.status === "ready";
  const honestlyUnavailable = !inferenceReady && /inference/.test(lower) && /(not available|unavailable|cannot|can't|can not)/.test(lower);
  if (answer && !answerGrounded && !honestlyUnavailable) problems.push("answer is neither grounded in the retrieved Fresh Flow knowledge nor an explicit statement that native inference is unavailable");
  return { ok: problems.length === 0, problems, mode: answerGrounded ? "grounded-answer" : honestlyUnavailable ? "retrieval-grounded-inference-unavailable" : "failed" };
}
