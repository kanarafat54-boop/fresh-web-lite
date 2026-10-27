import assert from "node:assert/strict";
import { evaluateAskPayload } from "./fresh-ai-smoke-assertions.mjs";
const evidence = [{ title: "fresh-platform-knowledge:Fresh Flow", snippet: "Fresh Flow is the media hub: a vertical Shorts feed plus long video, posts, news, podcasts and music." }];
// Real output of the current gateway for the smoke question, captured offline with retrieval enabled and no native inference.
const honest = "I found relevant Fresh Web Lite project documentation, but Fresh AI cannot reliably synthesize those notes into an answer because its native inference service is not available. The documents are references, not a generated model response.";
const base = { status: "completed", answer: honest, evidence, inference: { status: "training-required" } };
let n = 0; const t = (name, payload, ok, http = 200) => { const v = evaluateAskPayload(payload, http); assert.equal(v.ok, ok, `${name}: ${v.problems.join("; ")}`); n++; };
t("current honest behaviour with live retrieval passes", base, true);
t("synthesised grounded answer passes", { ...base, answer: "Fresh Flow offers Shorts, long video, posts, news, podcasts and music.", inference: { status: "ready" } }, true);
t("retrieval missing fails", { ...base, evidence: [] }, false);
t("retrieval from unrelated knowledge fails", { ...base, evidence: [{ title: "x", snippet: "Fresh Mail is encrypted." }] }, false);
t("fabricated ungrounded answer fails", { ...base, answer: "Fresh Flow is a cooking app." }, false);
t("claiming nothing about inference while ungrounded fails", { ...base, answer: "Sure, here you go." }, false);
t("empty answer fails", { ...base, answer: "  " }, false);
t("non-completed status fails", { ...base, status: "failed", error: "boom" }, false);
t("HTTP error fails", { error: "down" }, false, 503);
t("missing payload fields fail safely", {}, false);
t("inference ready but ungrounded fails", { ...base, inference: { status: "ready" }, answer: "I cannot say; inference unavailable" }, false);
console.log(`Fresh AI smoke assertions: PASS (${n} checks)`);
