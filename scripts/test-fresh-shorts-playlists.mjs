import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const service = read("src/features/fresh-flow/core/shortsPlaylists.ts");
const profile = read("src/features/fresh-flow/components/ShortsCreatorProfile.tsx");
const comments = read("src/features/comments/components/CommentPanel.tsx");
const collections = read("src/features/fresh-flow/components/ShortsCollectionsSheet.tsx");
const stream = read("src/features/fresh-flow/components/FreshFlowShortsStream.tsx");
const migration = read("supabase/migrations/20261102120000_fresh_short_collections_and_comment_pin.sql");
const hardening = read("supabase/migrations/20261102140000_harden_fresh_short_comment_pinning.sql");

for (const token of ["loadCreatorPlaylists", "loadMyShortPlaylists", "createShortPlaylist", "addShortToPlaylist", "loadMyShortCollections", "createShortCollection", "addShortToCollection", "loadPlaylistShorts"]) {
  assert.ok(service.includes(token), `playlist service missing ${token}`);
}
for (const token of ["Create a public playlist", "Add to collection or playlist", "loadCreatorPlaylists", "loadMyShortPlaylists"]) {
  assert.ok(profile.includes(token), `creator playlist UI missing ${token}`);
}
for (const token of ["Private — only me", "Public — visible on my profile", "createShortCollection", "addShortToCollection", "loadMyShortCollections"]) {
  assert.ok(collections.includes(token), `personal collections UI missing ${token}`);
}
assert.ok(stream.includes("ShortsCollectionsSheet"), "the player More actions opens the personal collections sheet");
assert.ok(stream.includes("Add to collection"), "the current Short can be added to a collection");
for (const token of ["pin_short_comment", "Pinned by creator", "togglePinned", "shortAuthorId"]) {
  assert.ok(comments.includes(token), `comment pin UI missing ${token}`);
}
assert.match(migration, /fresh_short_collections/);
assert.match(migration, /fresh_short_collection_items/);
assert.match(migration, /enable row level security/i);
assert.match(migration, /Only the creator of this Short can pin comments/);
assert.match(hardening, /short_comments_one_pin_per_short_idx/);
assert.match(hardening, /for update/i);
console.log("Fresh Shorts playlists and pinned-comment contract checks passed.");
