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
