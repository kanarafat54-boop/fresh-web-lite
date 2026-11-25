import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile(new URL("../src/features/fresh-flow/components/ShortsCollectionsSheet.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/features/fresh-flow/components/shortsContextPanel.css", import.meta.url), "utf8");
const playlists = await readFile(new URL("../src/features/fresh-flow/core/shortsPlaylists.ts", import.meta.url), "utf8");

assert.match(component, /groupCollections = collections\.filter\(\(collection\) => collection\.visibility === group\)/);
assert.match(component, /Public collections/);
assert.match(component, /Private collections/);
assert.match(component, /Visible on your profile/);
assert.match(component, /Only visible to you/);
assert.match(component, /aria-label=\{isPublic \? "Public collections" : "Private collections"\}/);
assert.match(component, /createShortCollection\(userId, title, description, visibility\)/);
assert.match(component, /addShortToCollection\(collection\.id, shortId/);
assert.match(playlists, /visibility/);
assert.match(styles, /\.shorts-collection-groups/);
assert.match(styles, /\.shorts-collection-group\[data-visibility="public"\]/);
assert.match(styles, /@media \(max-width:360px\)/);
assert.match(styles, /env\(safe-area-inset-bottom\)/);
assert.match(styles, /:focus-visible/);

console.log("fresh-shorts-collections: ok");
