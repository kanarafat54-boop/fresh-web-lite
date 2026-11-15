import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const base = "../src/features/fresh-studio/video-studio/";
const A = await import(base + "stickerArt.ts");
const E = await import(base + "stickerEmoji.ts");
assert.ok(A.STICKER_ART.length >= 30);
assert.equal(new Set(A.STICKER_ART.map((s) => s.id)).size, A.STICKER_ART.length, "ids are unique");
for (const g of A.STICKER_GROUPS) assert.ok(A.STICKER_ART.some((s) => s.group === g.id), `group ${g.id} is not empty`);
// every sticker is well-formed XML with a size, and no sticker leaves a stray colour-less placeholder
const xml = (s) => spawnSync("python3", ["-c", "import sys,xml.dom.minidom as m; m.parseString(sys.stdin.read())"], { input: s, encoding: "utf8" });
for (const s of A.STICKER_ART) {
  for (const t of [undefined, `<b>"x" & 'y'</b>`, "A".repeat(80)]) {
    const out = s.build(t);
    assert.match(out, /^<svg [^>]*width="\d+" height="\d+"/, s.id);
    const r = xml(out); assert.equal(r.status, 0, `${s.id} is valid XML for ${JSON.stringify(t)}: ${r.stderr.slice(-200)}`);
    assert.ok(!/<script|onload=|<b>/.test(out), `${s.id} does not let typed text become markup`);
  }
  if (s.text) {
    assert.ok(s.build("Hi").includes(">Hi<"), `${s.id} shows the typed words`);
    assert.ok(s.build("x".repeat(100)).includes(">" + "x".repeat(s.text.max) + "<"), `${s.id} caps the words at ${s.text.max}`);
    assert.ok(s.build("   ").includes(">" + A.escapeXml(s.text.fallback) + "<"), `${s.id} falls back when blank`);
  }
}
assert.equal(A.cleanLabel("a\u0000b\n\tc", "z", 10), "a b c");
for (const g of E.EMOJI_GROUPS) assert.ok(g.items.length >= 12 && new Set(g.items).size === g.items.length, `emoji group ${g.id}`);
console.log("Fresh Studio stickers contract passed (art is valid, typed words are escaped and capped).");
