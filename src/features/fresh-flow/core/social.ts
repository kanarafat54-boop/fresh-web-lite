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

/** Friends are mutual: people you follow who also follow you back. */
export async function getFriendAuthorIds(userId: string): Promise<string[]> {
  const [{ data: following }, { data: followers }] = await Promise.all([
    supabase.from("follows").select("followed_id").eq("follower_id", userId),
    supabase.from("follows").select("follower_id").eq("followed_id", userId),
  ]);
  const followsMe = new Set((followers ?? []).map((row: any) => row.follower_id as string));
  return Array.from(new Set((following ?? []).map((row: any) => row.followed_id as string))).filter((id) => followsMe.has(id));
}

export async function setAuthorFollow(followerId: string, followedId: string, following: boolean): Promise<void> {
  if (followerId === followedId) throw new Error("You cannot follow yourself.");
  if (following) {
    // follows has no UPDATE policy, so an upsert is refused; a plain insert works and a repeat follow is already done.
    const { error } = await supabase.from("follows").insert({ follower_id: followerId, followed_id: followedId });
    if (error && error.code !== "23505") throw new Error(error.message || "Fresh could not update the follow right now.");
    return;
  }
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("followed_id", followedId);
  if (error) throw new Error(error.message || "Fresh could not update the follow right now.");
}
