import { supabase } from "../../../lib/supabase";

export type FreshShortPlaylist = {
  id: string;
  title: string;
  description: string | null;
  visibility: "private" | "public";
  createdAt: string;
  shortIds: string[];
};

export async function loadCreatorPlaylists(authorId: string): Promise<FreshShortPlaylist[]> {
  const { data, error } = await supabase
    .from("fresh_short_collections")
    .select("id,title,description,visibility,created_at,fresh_short_collection_items(short_id,position)")
    .eq("user_id", authorId)
    .in("kind", ["playlist", "collection"])
    .eq("visibility", "public")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    visibility: row.visibility,
    createdAt: row.created_at,
    shortIds: (row.fresh_short_collection_items ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => item.short_id),
  }));
}

export async function loadMyShortPlaylists(userId: string): Promise<FreshShortPlaylist[]> {
  const { data, error } = await supabase
    .from("fresh_short_collections")
    .select("id,title,description,visibility,created_at,fresh_short_collection_items(short_id,position)")
    .eq("user_id", userId)
    .in("kind", ["playlist", "collection"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    visibility: row.visibility,
    createdAt: row.created_at,
    shortIds: (row.fresh_short_collection_items ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => item.short_id),
  }));
}

export async function createShortPlaylist(userId: string, title: string, description = ""): Promise<string> {
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 80) throw new Error("Playlist title must be between 1 and 80 characters.");
  if (description.length > 500) throw new Error("Playlist description must be 500 characters or fewer.");
  const { data, error } = await supabase
    .from("fresh_short_collections")
    .insert({ user_id: userId, kind: "playlist", title: cleanTitle, description: description.trim() || null, visibility: "public" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function loadMyShortCollections(userId: string): Promise<FreshShortPlaylist[]> {
  const { data, error } = await supabase
    .from("fresh_short_collections")
    .select("id,title,description,visibility,created_at,fresh_short_collection_items(short_id,position)")
    .eq("user_id", userId)
    .eq("kind", "collection")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    visibility: row.visibility,
    createdAt: row.created_at,
    shortIds: (row.fresh_short_collection_items ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => item.short_id),
  }));
}

export async function createShortCollection(
  userId: string,
  title: string,
  description: string,
  visibility: "private" | "public",
): Promise<string> {
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 80) throw new Error("Collection title must be between 1 and 80 characters.");
  if (description.length > 500) throw new Error("Description must be 500 characters or fewer.");
  const { data, error } = await supabase
    .from("fresh_short_collections")
    .insert({ user_id: userId, kind: "collection", title: cleanTitle, description: description.trim() || null, visibility })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function addShortToCollection(collectionId: string, shortId: string, position: number): Promise<void> {
  const { error } = await supabase
    .from("fresh_short_collection_items")
    .upsert({ collection_id: collectionId, short_id: shortId, position }, { onConflict: "collection_id,short_id" });
  if (error) throw error;
}

export async function addShortToPlaylist(playlistId: string, shortId: string, position: number): Promise<void> {
  const { error } = await supabase
    .from("fresh_short_collection_items")
    .upsert({ collection_id: playlistId, short_id: shortId, position }, { onConflict: "collection_id,short_id" });
  if (error) throw error;
}

export async function loadPlaylistShorts(shortIds: string[]) {
  if (!shortIds.length) return [];
  const { data, error } = await supabase
    .from("shorts")
    .select("id,caption,video_url,view_count,created_at")
    .in("id", shortIds);
  if (error) throw error;
  const byId = new Map((data ?? []).map((row: any) => [row.id, row]));
  return shortIds.flatMap((id) => {
    const row: any = byId.get(id);
    return row ? [{ id: row.id, caption: row.caption ?? "", videoUrl: row.video_url, viewCount: row.view_count ?? 0, createdAt: row.created_at }] : [];
  });
}

/** Cover images for collections: the first Short of each. Returns collection id -> video url (first frame is drawn from it). */
export async function loadCollectionCovers(collections: Pick<FreshShortPlaylist, "id" | "shortIds">[]): Promise<Record<string, string>> {
  const firstIds = collections.map((c) => c.shortIds[0]).filter((id): id is string => Boolean(id));
  if (!firstIds.length) return {};
  const { data, error } = await supabase.from("shorts").select("id,video_url").in("id", firstIds);
  if (error) return {};
  const urlById = new Map((data ?? []).map((row: any) => [row.id, row.video_url as string]));
  const covers: Record<string, string> = {};
  for (const c of collections) { const url = c.shortIds[0] ? urlById.get(c.shortIds[0]) : undefined; if (url) covers[c.id] = url; }
  return covers;
}

/**
 * Collections other people shared with this viewer. Reads fresh_short_collection_members, which exists only after the
 * shared-collections migration is applied; before that this returns { available: false } instead of failing.
 */
export async function loadSharedCollections(userId: string): Promise<{ available: boolean; collections: FreshShortPlaylist[] }> {
  const { data, error } = await supabase
    .from("fresh_short_collection_members")
    .select("fresh_short_collections(id,title,description,visibility,created_at,fresh_short_collection_items(short_id,position))")
    .eq("member_id", userId);
  if (error) return { available: false, collections: [] };
  const collections = (data ?? []).flatMap((row: any) => {
    const c = row.fresh_short_collections;
    return c ? [{
      id: c.id, title: c.title, description: c.description ?? null, visibility: c.visibility, createdAt: c.created_at,
      shortIds: (c.fresh_short_collection_items ?? []).sort((a: any, b: any) => a.position - b.position).map((i: any) => i.short_id),
    } as FreshShortPlaylist] : [];
  });
  return { available: true, collections };
}

/**
 * Shares one of the viewer's collections with another person, found by their @username. The database only lets the
 * collection's owner add members, and the invited person can read (not change) the collection.
 */
export async function inviteToCollection(collectionId: string, ownerId: string, rawUsername: string): Promise<{ ok: true; name: string } | { ok: false; reason: string }> {
  const username = rawUsername.trim().replace(/^@/, "");
  if (!username) return { ok: false, reason: "Type the person's @username." };
  const { data: person, error: lookupError } = await supabase.from("user_public_profiles").select("id,full_name,username").ilike("username", username).limit(1).maybeSingle();
  if (lookupError || !person) return { ok: false, reason: `No one on Fresh has the username @${username}.` };
  if ((person as any).id === ownerId) return { ok: false, reason: "This collection is already yours." };
  const { error } = await supabase
    .from("fresh_short_collection_members")
    .upsert({ collection_id: collectionId, member_id: (person as any).id, invited_by: ownerId, role: "viewer" }, { onConflict: "collection_id,member_id" });
  if (error) return { ok: false, reason: error.message.includes("fresh_short_collection_members") ? "Sharing is not switched on yet." : error.message };
  return { ok: true, name: (person as any).full_name || `@${(person as any).username}` };
}
