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
    .eq("kind", "playlist")
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
    .eq("kind", "playlist")
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
