import assert from "node:assert/strict";
import { judgeFreshFlowAnswer } from "./lib/fresh-flow-answer-check.mjs";

const prefix = "From Fresh Web Lite’s retrieved project documentation (source-grounded notes, not a trained-model response): ";
// The wording that broke the old check: doctrine rows rank first and say "Short-form video".
const doctrine = prefix + "1. Doc: FRESH_WEB_LITE_UNIVERSAL_PLATFORM_DOCTRINE — 4. FRESH FLOW AS THE UNIVERSAL MEDIA LAYER: - Short-form video - Long-form video - News and posts - Podcasts - Audio - AR - VR - Images - Text - Live experiences";
// The wording that passed before: architecture doc.
const architecture = prefix + "Doc: FRESH_FLOW_MEDIA_ARCHITECTURE — Six media worlds: Fresh Short, Long Videos, News / Posts, VR / AR, Podcasts, Others. Fresh Flow remains the larger media universe.";
assert.deepEqual(judgeFreshFlowAnswer(doctrine), { ok: true });
assert.deepEqual(judgeFreshFlowAnswer(architecture), { ok: true });

for (const [label, text] of [
  ["empty", ""],
  ["not grounded", "Fresh Flow has shorts, podcasts, music and news."],
  ["off topic", prefix + "The owner can issue machine credentials with shorts:read and proof:read scopes."],
  ["too few formats", prefix + "Fresh Flow is a media layer. It has short videos."],
  ["'ar' inside another word does not count", prefix + "Fresh Flow is a media layer for shared share parts."],
]) assert.equal(judgeFreshFlowAnswer(text).ok, false, label);
assert.equal(judgeFreshFlowAnswer(undefined).ok, false);
console.log("smoke answer check ok");
