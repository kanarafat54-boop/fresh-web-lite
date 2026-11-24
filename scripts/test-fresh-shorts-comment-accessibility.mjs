import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const panel = readFileSync("src/features/comments/components/CommentPanel.tsx", "utf8");
const panelCss = readFileSync("src/features/comments/components/CommentPanel.css", "utf8");
const playerCss = readFileSync("src/features/fresh-flow/components/FreshFlowVisualRefresh.css", "utf8");
const navCss = readFileSync("src/app/components/BottomNav.css", "utf8");

const referenceCss = readFileSync("src/features/fresh-flow/components/FreshFlowReferenceDirection.css", "utf8");
const flowHub = readFileSync("src/features/fresh-flow/FreshFlowHub.tsx", "utf8");


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
assert.match(panel, /className="comment-composer-avatar"/, "first composer row includes the current-user avatar");
assert.match(panel, /<textarea[\s\S]*?onKeyDown=\{\(event\) => \{ if \(event\.key === "Enter" && !event\.shiftKey\)/, "comment writing expands and preserves Shift+Enter newlines");
assert.match(panel, /aria-label="Attach an image"/, "single-image attachment has a dedicated entry point");
assert.match(panel, /aria-label="Choose image gallery"/, "multi-image gallery has a dedicated entry point");
assert.match(panel, /aria-label="Attach audio, video or other files"/, "the general media/file attachment path is preserved");
assert.match(panel, /profile_details"\)\.select\("user_id,avatar_url"\)/, "comment avatars use the privacy-filtered profile details view");
assert.match(panel, /authorAvatarUrl: avatarMap\.get\(row\.author_id\)/, "comment cards receive public-author avatars");
assert.match(panel, /authorVerified: Boolean\(profileMap\.get\(row\.author_id\)\?\.verified\)/, "verified status is shown only from public profile data");
assert.match(panel, /comment-creator-badge/, "Short creators receive a subtle identity badge on their comments");
assert.match(panel, /useState<CommentSortMode>\("relevant"\)/, "comments default to a useful relevant conversation");
assert.match(panel, /comment-filter-row/, "comment media and conversation filters are exposed");
assert.match(panel, /\["creator", "Creator replies"\]/, "creator replies have a dedicated filter");
assert.match(panel, /\["questions", "Questions"\]/, "questions have a dedicated filter");
assert.match(panel, /comment-reply-count/, "comment cards expose reply counts");
assert.match(panel, /function findRootComment/, "nested replies resolve to their root thread");
assert.match(panel, /function openReplyThread/, "Reply opens a focused thread view");
assert.match(panel, /function backToAllComments/, "thread view returns to all comments");
assert.match(panel, /allCommentsScrollTopRef\.current = commentListRef\.current\?\.scrollTop/, "all-comments scroll position is saved before opening a thread");
assert.match(panel, /commentListRef\.current\.scrollTop = allCommentsScrollTopRef\.current/, "all-comments scroll position is restored when leaving a thread");
assert.match(panel, /aria-label=\{activeThreadRootId \? "Thread replies" : "All comments"\}/, "thread view is announced accessibly");
assert.match(panel, /threadReplyCount === 1 \? "reply" : "replies"/, "thread header reports a correctly pluralized reply count");
assert.match(panel, /comment-reaction-summary/, "reaction counts open an accessible breakdown");
assert.match(panel, /async function copyCommentText/, "authors can copy their comment text");
assert.match(panel, /async function shareComment/, "comments have a native share or clipboard fallback");
assert.match(panel, /function markNotInterested/, "viewers can dismiss an unwanted comment");
assert.match(panel, /Comment hidden for this session\./, "session-only dismissal is communicated honestly");
assert.match(panel, /Copy Short link/, "viewers can copy the current Short link from a comment");
assert.match(panel, /Share comment/, "comment share action is discoverable");
assert.match(panel, /aria-label="Attach audio, video or other files"/, "general media and file attachment path remains accessible");
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
assert.match(panelCss, /\.comment-composer-avatar/, "current-user avatar has a dedicated compact style");
assert.match(panelCss, /textarea\.comment-input:focus\{min-height:72px/, "comment composer expands while writing");
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


assert.match(flowHub, /FreshFlowReferenceDirection\\.css/, "Fresh Flow hub loads the additive reference-direction design layer");
assert.match(referenceCss, /--ff-canvas:\\s*#0d0d12/, "reference design uses the Fresh Flow midnight canvas token");
assert.match(referenceCss, /--ff-green:\\s*#22e58a/, "reference design includes the Fresh green accent");
assert.match(referenceCss, /--ff-violet:\\s*#635bff/, "reference design retains the Fresh violet accent");
assert.match(referenceCss, /\\.fresh-flow-home-hero/, "reference styling covers the Fresh Flow Home hero");
assert.match(referenceCss, /\\.fresh-flow-stream\\[data-discovery\\] \\.fresh-flow-actions/, "reference styling covers the Shorts action rail");
assert.match(referenceCss, /\\.fresh-comments-backdrop\\s*\\{[^}]*z-index:\\s*420/s, "comments surface stacks above persistent bottom navigation");
assert.match(referenceCss, /safe-area-inset-bottom/, "reference styling respects device bottom safe areas");
assert.match(referenceCss, /prefers-reduced-motion/, "reference styling includes reduced-motion handling");

console.log("Fresh Shorts comment accessibility, media-only submission, block/mute separation and navigation-clearance contracts: PASS");
