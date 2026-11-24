import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const panel = readFileSync("src/features/comments/components/CommentPanel.tsx", "utf8");
const panelCss = readFileSync("src/features/comments/components/CommentPanel.css", "utf8");
const playerCss = readFileSync("src/features/fresh-flow/components/FreshFlowVisualRefresh.css", "utf8");
const navCss = readFileSync("src/app/components/BottomNav.css", "utf8");

assert.match(panel, /role="dialog" aria-modal="true" aria-labelledby="fresh-comments-title"/, "comments sheet exposes modal semantics and a visible title");
assert.match(panel, /onCloseRef\.current\(\)/, "Escape closes the dialog without rebinding its focus effect");
assert.match(panel, /previousFocus\?\.focus\(\)/, "closing restores focus to the invoking control");
assert.match(panel, /panel\.addEventListener\("keydown", handleKeyDown\)/, "keyboard focus is trapped within the open comments sheet");
assert.match(panel, /getClientRects\(\)\.length > 0/, "hidden controls are excluded from the focus cycle");
assert.match(panel, /window\.visualViewport/, "virtual-keyboard viewport is observed");
assert.match(panel, /--fresh-comments-vh/, "comment sheet height follows the visible viewport when the keyboard opens");
assert.match(panel, /className="comment-composer"/, "composer is separated from the scrollable comment list");
assert.match(panel, /className="comment-input-row"/, "text entry and send controls occupy the primary composer row");
assert.match(panel, /className="comment-tools-row" role="group"/, "attachment and recording tools occupy a labelled secondary row");
assert.match(panel, /aria-label="Attach images or files"/, "attachment picker has an accessible button");
assert.match(panel, /content: draft\.trim\(\),/, "media-only comments satisfy the live non-null content column");
assert.doesNotMatch(panel, /content: draft\.trim\(\)\s*\|\|\s*null/, "media-only comments are not inserted with null content");

const blockStart = panel.indexOf("async function blockAuthor(");
const blockEnd = panel.indexOf("\n  }", blockStart);
assert.ok(blockStart >= 0 && blockEnd > blockStart, "comment block action exists");
const blockBody = panel.slice(blockStart, blockEnd);
assert.match(blockBody, /blockAccount\(user\.id, authorId\)/, "Block writes to the real user_blocks service");
assert.doesNotMatch(blockBody, /setCreatorMuted/, "Block never substitutes a mute");
assert.match(panel, /uploadedPaths\.push\(path\)/, "successful media uploads are tracked for cleanup");
assert.match(panel, /storage\.from\("comment-media"\)\.remove\(uploadedPaths\)/, "failed comment submissions clean up uploaded files");
assert.match(panel, /storage\.from\("comment-media"\)\.remove\(mediaPaths\)/, "deleting a comment removes its owned media objects");
assert.match(panel, /commentMediaPathFromUrl/, "media cleanup only targets URLs from the comment-media bucket");
const muteStart = panel.indexOf("async function muteAuthor(");
const muteEnd = panel.indexOf("\n  }", muteStart);
assert.ok(muteStart >= 0 && muteEnd > muteStart, "comment mute action exists");
assert.match(panel.slice(muteStart, muteEnd), /setCreatorMuted/, "Mute retains its separate preference service");

assert.match(panelCss, /\.comment-composer/, "two-row composer styles exist");
assert.match(panelCss, /\.comment-tools-row button:focus-visible/, "secondary composer controls have visible focus");
assert.match(panelCss, /padding-bottom:0;background:transparent/, "safe-area padding is not duplicated on the text row");
assert.match(playerCss, /--fresh-flow-nav-clearance/, "Shorts overlays reserve space above persistent bottom navigation");
assert.match(playerCss, /\.fresh-flow-stream \.fresh-flow-actions\{bottom:var\(--fresh-flow-nav-clearance\)\}/, "Shorts action rail uses navigation clearance");
assert.match(playerCss, /--fresh-flow-nav-clearance:calc\(82px/, "player clearance accounts for the readable six-item navigation");
assert.match(navCss, /\.fresh-flow-bottom-nav \.fresh-nav-label\{font-size:clamp\(\.62rem/, "six-item navigation labels are readable");
assert.match(navCss, /\.fresh-flow-bottom-nav \.fresh-nav-label\{font-size:\.6rem\}/, "narrow-phone labels retain a readable minimum");
assert.match(navCss, /\.fresh-flow-bottom-nav \.fresh-flow-nav-item\.active\{[\s\S]*?rgba\(79,70,229/, "active Flow navigation state uses the indigo master accent");
assert.match(playerCss, /#635bff/, "Fresh Flow refresh uses the master violet accent");
assert.doesNotMatch(playerCss, /#42e58b/, "the prior green accent no longer overrides the master identity");

console.log("Fresh Shorts comment accessibility, media-only submission, block/mute separation and navigation-clearance contracts: PASS");
