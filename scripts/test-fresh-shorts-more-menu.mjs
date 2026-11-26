import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const stream = read("src/features/fresh-flow/components/FreshFlowShortsStream.tsx");
const css = read("src/features/fresh-flow/components/shortsFullscreen.css");

const start = stream.indexOf('role="group" aria-label="More actions"');
assert.ok(start > 0, "More actions menu must exist");
const end = stream.indexOf("\n                  </div>\n                )}", start);
const menu = stream.slice(start, end);

// Preservation: all 30 original controls remain, plus Add to collection and the creator download-permission control (32 buttons total).
assert.equal((menu.match(/<button/g) ?? []).length, 38, "the More menu keeps all 32 original controls and adds 6 Quick action tiles");
assert.equal((menu.match(/ADVANCED_ACTIONS\.map/g) ?? []).length, 1, "Quote, Remix, Duet, Collaborate, Edit tools, Captions and Effects remain");
assert.equal((menu.match(/<div/g) ?? []).length, 1, "the only wrapper is the Quick actions grid; every other row stays a direct child of the menu");

// Every capability is still reachable by its original label.
const labels = [
  "Send gift", "Ask Fresh AI", "Mute sound", "Playback speed", "Captions: On", "Write captions", "Upload captions",
  "Context and sources", "Why am I seeing this?", "Predictions", "Origin", "Review queue", "Saved Shorts", "Watch history",
  "Add to collection", "Privacy and safety", "Comments here: everyone", "Comments here: people I follow", "Comments here: off", "Allow downloads:",
  "Show more like this", "Show less like this", "Hide topic", "Manage recommendations", "Not interested", "Mute @", "Block @", "Blocked accounts", "Report",
];
for (const label of labels) assert.ok(menu.includes(label), `menu still offers "${label}"`);

// Headings, in order, with the right controls beneath each.
const headings = ["Support and explore", "Playback and captions", "About this Short", "Your library and privacy", "Moderation", "Your Short", "Create from this Short", "Your feed and safety"];
const at = (text) => { const index = menu.indexOf(`fresh-flow-advanced-heading">${text}<`); assert.ok(index >= 0, `heading "${text}" exists`); return index; };
const positions = headings.map(at);
assert.deepEqual([...positions].sort((a, b) => a - b), positions, "headings appear in the intended order");
const under = (heading, label, next) => {
  const where = menu.indexOf(label, at(heading));
  assert.ok(where > at(heading) && (!next || where < at(next)), `"${label}" sits under "${heading}"`);
};
under("Support and explore", "Send gift", "Playback and captions");
under("Support and explore", "Ask Fresh AI", "Playback and captions");
under("Playback and captions", "Mute sound", "About this Short");
under("Playback and captions", "Playback speed", "About this Short");
under("About this Short", "Context and sources", "Your library and privacy");
under("About this Short", "Origin", "Your library and privacy");
under("Your library and privacy", "Saved Shorts", "Moderation");
under("Your library and privacy", "Add to collection", "Moderation");
under("Your library and privacy", "Privacy and safety", "Moderation");
under("Moderation", "Review queue", "Your Short");
under("Your Short", "Comments here: off", "Create from this Short");
under("Your Short", "Allow downloads:", "Create from this Short");
under("Create from this Short", "ADVANCED_ACTIONS.map", "Your feed and safety");
under("Your feed and safety", "Not interested");
under("Your feed and safety", "Block @");
under("Your feed and safety", "Report");

// Signed-in-only and reviewer-only headings must not show for people who cannot use the controls beneath them.
assert.match(menu, /\{user && !isGuest \? <p className="fresh-flow-advanced-heading">Your library and privacy<\/p> : null\}/);
assert.match(menu, /\{user && !isGuest && isReviewer\(user\.role\) \? <p className="fresh-flow-advanced-heading">Moderation<\/p> : null\}/);

// Headings are labels: styled, and not styled as the button rows.
assert.match(css, /\.fresh-flow-advanced-heading\s*\{[^}]*text-transform: uppercase/);
// Quick actions grid (the "More Actions" card in the UI references): six tiles that reuse existing handlers.
const qStart = menu.indexOf('className="fresh-flow-quick-actions"');
assert.ok(qStart >= 0 && qStart < menu.indexOf('fresh-flow-advanced-heading">Support and explore<'), "Quick actions sit at the top of the More menu");
const quick = menu.slice(qStart, menu.indexOf("</div>", qStart));
assert.equal((quick.match(/<button/g) ?? []).length, 6, "six Quick action tiles");
for (const [label, handler] of [["Download", "downloadShort(short)"], ["Remix", 'openAdvanced("remix", short)'], ["Add to Collection", "setCollectionShortId(short.id)"], ["Use Sound", 'setTopicPage({ kind: "sound"'], ["Follow Creator", "handleFollow(short)"], ["Report", "setReportTarget(short)"]]) {
  assert.ok(quick.includes(`<span>${label}</span>`), `Quick action "${label}" exists`);
  assert.ok(quick.includes(handler), `"${label}" reuses the existing handler ${handler}`);
}
assert.match(quick, /\{short\.allowDownload \? \(/, "Download only appears when the creator allowed it");
assert.match(quick, /\{user && !isGuest \? \(/, "Add to Collection needs a signed-in account, like the full menu row");
assert.match(quick, /\{short\.soundName \? \(/, "Use Sound only appears when the Short has a sound");
assert.match(quick, /short\.authorId !== user\?\.id && !followingAuthors\.has\(short\.authorId\)/, "Follow Creator is hidden for your own Short and for creators you follow");
assert.match(css, /\.fresh-flow-quick-actions\s*\{[^}]*grid-template-columns: repeat\(3/, "Quick actions are a three-column tile grid");
console.log("Shorts More menu grouping: PASS");

// Gesture shortcuts into the More actions panel (triple tap, hold -> "More actions").
{
  const stream = (await import("node:fs")).readFileSync("src/features/fresh-flow/components/FreshFlowShortsStream.tsx", "utf8");
  const gestureChecks = [
    ["tap tracker counts taps", /lastTapRef = useRef<\{ id: string; at: number; count: number \}/.test(stream)],
    ["double tap still likes", /count === 1 && now - last\.at < DOUBLE_TAP_MS[\s\S]{0,400}handleReaction\(short\.id, "like"/.test(stream)],
    ["triple tap opens More actions", /count === 2 && now - last\.at < DOUBLE_TAP_MS[\s\S]{0,200}setAdvancedOpen\(true\)/.test(stream)],
    ["hold sheet links to More actions", /shorts-more-from-hold[^>]*onClick=\{\(\) => \{ setPlaybackFor\(null\); setAdvancedOpen\(true\); \}\}/.test(stream)],
    ["hold sheet keeps playback speeds", /aria-label="Playback speed"/.test(stream)],
  ];
  for (const [name, ok] of gestureChecks) {
    if (!ok) { console.error(`FAIL gesture: ${name}`); process.exitCode = 1; } else console.log(`ok gesture: ${name}`);
  }
}
