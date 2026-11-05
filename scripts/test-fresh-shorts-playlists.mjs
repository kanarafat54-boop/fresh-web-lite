import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const service = read("src/features/fresh-flow/core/shortsPlaylists.ts");
const profile = read("src/features/fresh-flow/components/ShortsCreatorProfile.tsx");
const comments = read("src/features/comments/components/CommentPanel.tsx");
const migration = read("supabase/migrations/20261102120000_fresh_short_collections_and_comment_pin.sql");
const hardening = read("supabase/migrations/20261102140000_harden_fresh_short_comment_pinning.sql");

for (const token of ["loadCreatorPlaylists", "loadMyShortPlaylists", "createShortPlaylist", "addShortToPlaylist", "loadPlaylistShorts"]) {
  assert.ok(service.includes(token), `playlist service missing ${token}`);
}
for (const token of ["Create a playlist", "Create public playlist", "Add to playlist", "loadCreatorPlaylists", "loadMyShortPlaylists"]) {
  assert.ok(profile.includes(token), `creator playlist UI missing ${token}`);
}
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
