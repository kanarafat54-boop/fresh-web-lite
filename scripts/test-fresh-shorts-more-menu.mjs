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
assert.equal((menu.match(/<button/g) ?? []).length, 32, "the More menu keeps all original controls, Add to collection and the creator download-permission control");
assert.equal((menu.match(/ADVANCED_ACTIONS\.map/g) ?? []).length, 1, "Quote, Remix, Duet, Collaborate, Edit tools, Captions and Effects remain");
assert.equal((menu.match(/<div/g) ?? []).length, 0, "no wrapper elements: the row styles target direct children of the menu");

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
console.log("Shorts More menu grouping: PASS");
