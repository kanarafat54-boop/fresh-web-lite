import { supabase } from "../../../lib/supabase";

/**
 * Everyone the user follows plus everyone who follows them -- the author set
 * behind the "Following" tab on both Fresh Flow and Home, so the two screens
 * never drift apart in what "following" means.
 */
export async function getSocialAuthorIds(userId: string): Promise<string[]> {
  const [{ data: following }, { data: followers }] = await Promise.all([
    supabase.from("follows").select("followed_id").eq("follower_id", userId),
    supabase.from("follows").select("follower_id").eq("followed_id", userId),
  ]);
  const ids = new Set<string>();
  (following ?? []).forEach((row: any) => ids.add(row.followed_id));
  (followers ?? []).forEach((row: any) => ids.add(row.follower_id));
  return Array.from(ids);
}


export async function setAuthorFollow(followerId: string, followedId: string, following: boolean): Promise<void> {
  if (followerId === followedId) throw new Error("You cannot follow yourself.");
  if (following) {
    const { error } = await supabase.from("follows").upsert({ follower_id: followerId, followed_id: followedId }, { onConflict: "follower_id,followed_id" });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("followed_id", followedId);
  if (error) throw error;
}
