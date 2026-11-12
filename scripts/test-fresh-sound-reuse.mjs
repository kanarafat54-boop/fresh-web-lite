import assert from "node:assert/strict";
import { creditLine, decideReuse, explainSoundError, isSoundSource } from "../src/features/fresh-flow/core/soundReuse.ts";

const A = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const src = { name: "Rain on tin", sourceShortId: S, sourceAuthorId: A, sourceVideoUrl: "https://x.test/a.mp4", creatorLabel: "@amina" };

assert.equal(isSoundSource(src), true);
assert.equal(isSoundSource({ ...src, creatorLabel: null }), true);
for (const bad of [null, {}, { ...src, name: " " }, { ...src, sourceShortId: "nope" }, { ...src, sourceVideoUrl: "javascript:alert(1)" }, { ...src, sourceAuthorId: 3 }, { ...src, name: "x".repeat(201) }]) assert.equal(isSoundSource(bad), false);

assert.equal(creditLine(src), "Original sound: Rain on tin by @amina");
assert.equal(creditLine({ ...src, creatorLabel: null }), "Original sound: Rain on tin");

assert.equal(decideReuse({ viewerId: null, sourceAuthorId: A, reuseAllowed: true }).allowed, false);
assert.equal(decideReuse({ viewerId: "v", sourceAuthorId: A, reuseAllowed: false }).allowed, false);
assert.equal(decideReuse({ viewerId: "v", sourceAuthorId: A, reuseAllowed: true }).allowed, true);
assert.equal(decideReuse({ viewerId: A, sourceAuthorId: A, reuseAllowed: false }).allowed, true, "own sound is always allowed");

assert.match(explainSoundError("The creator does not allow others to use this sound.") ?? "", /does not allow/);
assert.match(explainSoundError("The original Short for this sound was not found.") ?? "", /no longer available/);
assert.equal(explainSoundError("something else"), null);
assert.equal(explainSoundError(undefined), null);
console.log("sound reuse: ok");
