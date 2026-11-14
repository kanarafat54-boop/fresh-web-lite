import { supabase } from "../../../lib/supabase";
import { buildActivityItems, type ActivityItem, type RawActivity } from "./shortsActivityModel";

export { timeAgo, ACTIVITY_TABS, matchesTab } from "./shortsActivityModel";
export type { ActivityItem, ActivityKind, ActivityTab } from "./shortsActivityModel";

const LIMIT = 40;
const FOLLOWED_WINDOW_DAYS = 14;
const rowsOf = <T,>(result: unknown): T[] => ((result as { data?: T[] | null } | null)?.data ?? []) as T[];

/**
 * Real activity on the signed-in creator's Shorts, read from existing tables: likes, comments, replies to their
 * comments, reactions to their comments, reposts, remixes and duets, new followers, gifts, plus their own
 * `notifications` rows. Nothing is invented; an empty account gets an empty list. All of these tables are
 * readable by everyone except `notifications`, which is limited to its owner.
 */
export async function loadShortsActivity(userId: string): Promise<ActivityItem[]> {
  const [mineShorts, myCommentRows, meRow, followingRows, hiddenShortRows] = await Promise.all([
    supabase.from("shorts").select("id, caption").eq("author_id", userId).limit(200),
    supabase.from("short_comments").select("id, short_id, content, moderation_state, moderation_reason, moderated_at").eq("author_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("user_public_profiles").select("username").eq("id", userId).maybeSingle(),
    supabase.from("follows").select("followed_id").eq("follower_id", userId).limit(200),
    // Hidden Shorts need the moderation update; before it exists this query errors and simply returns none.
    supabase.from("shorts").select("id, caption, moderation_reason, moderated_at").eq("author_id", userId).eq("moderation_state", "hidden").limit(50),
  ]);
  const myUsername = ((meRow as { data?: { username?: string | null } | null }).data?.username ?? "").trim() || null;
  const followedIds = rowsOf<{ followed_id: string }>(followingRows).map((row) => row.followed_id);
  const since = new Date(Date.now() - FOLLOWED_WINDOW_DAYS * 86_400_000).toISOString();
  const myShorts = rowsOf<{ id: string; caption: string | null }>(mineShorts);
  const myComments = rowsOf<{ id: string; short_id: string; content: string | null; moderation_state: string | null; moderation_reason: string | null; moderated_at: string | null }>(myCommentRows);
  const shortIds = myShorts.map((short) => short.id);
  const commentIds = myComments.map((comment) => comment.id);
  const none = Promise.resolve({ data: [] });

  const [likes, comments, replies, reactions, reposts, remixes, gifts, follows, system, mentions, followedShorts] = await Promise.all([
    shortIds.length ? supabase.from("short_likes").select("short_id, user_id, created_at, reaction_type").in("short_id", shortIds).neq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : none,
    shortIds.length ? supabase.from("short_comments").select("id, short_id, author_id, content, created_at, parent_id, moderation_state").in("short_id", shortIds).neq("author_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : none,
    commentIds.length ? supabase.from("short_comments").select("id, short_id, author_id, content, created_at, parent_id, moderation_state").in("parent_id", commentIds).neq("author_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : none,
    commentIds.length ? supabase.from("short_comment_reactions").select("comment_id, user_id, reaction_type, created_at").in("comment_id", commentIds).neq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : none,
    shortIds.length ? supabase.from("short_reposts").select("short_id, user_id, created_at").in("short_id", shortIds).neq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : none,
    // Remix and duet links exist only after the remix migration; an error just means none are reported.
    shortIds.length ? supabase.from("shorts").select("id, author_id, created_at, remix_of_short_id, duet_of_short_id").or(`remix_of_short_id.in.(${shortIds.join(",")}),duet_of_short_id.in.(${shortIds.join(",")})`).neq("author_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : none,
    supabase.from("short_gifts").select("id, short_id, sender_id, created_at").eq("recipient_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    supabase.from("follows").select("follower_id, created_at").eq("followed_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    supabase.from("notifications").select("id, title, body, read_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    // Mentions are comments whose text contains @username; the model re-checks each one precisely.
    myUsername ? supabase.from("short_comments").select("id, short_id, author_id, content, created_at, moderation_state").ilike("content", `%@${myUsername.replace(/[%_\\]/g, "\\$&")}%`).neq("author_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : none,
    followedIds.length ? supabase.from("shorts").select("id, author_id, created_at, caption").in("author_id", followedIds).gte("created_at", since).order("created_at", { ascending: false }).limit(LIMIT) : none,
  ]);

  const raw: RawActivity = {
    viewerId: userId,
    captions: new Map(myShorts.map((short) => [short.id, short.caption ?? ""])),
    myComments: new Map(myComments.map((comment) => [comment.id, { short_id: comment.short_id, content: comment.content, moderation_state: comment.moderation_state, moderation_reason: comment.moderation_reason, moderated_at: comment.moderated_at }])),
    names: new Map(),
    hiddenShorts: rowsOf(hiddenShortRows),
    myUsername,
    shortAuthors: new Map(),
    mentions: rowsOf(mentions),
    followedShorts: rowsOf(followedShorts),
    likes: rowsOf(likes),
    comments: rowsOf(comments),
    replies: rowsOf(replies),
    commentReactions: rowsOf(reactions),
    reposts: rowsOf(reposts),
    remixes: rowsOf(remixes),
    gifts: rowsOf(gifts),
    follows: rowsOf(follows),
    system: rowsOf(system),
  };

  const replyShortIds = [...new Set(raw.replies.map((r) => r.short_id))];
  if (replyShortIds.length) {
    const { data } = await supabase.from("shorts").select("id, author_id").in("id", replyShortIds);
    for (const row of (data ?? []) as Array<{ id: string; author_id: string }>) raw.shortAuthors.set(row.id, row.author_id);
  }
  const actorIds = [...new Set([
    ...raw.likes.map((r) => r.user_id), ...raw.comments.map((r) => r.author_id), ...raw.replies.map((r) => r.author_id),
    ...raw.commentReactions.map((r) => r.user_id), ...raw.reposts.map((r) => r.user_id), ...raw.remixes.map((r) => r.author_id),
    ...raw.gifts.map((r) => r.sender_id), ...raw.follows.map((r) => r.follower_id),
    ...raw.mentions.map((r) => r.author_id), ...raw.followedShorts.map((r) => r.author_id),
  ].filter(Boolean))];
  if (actorIds.length) {
    const { data } = await supabase.from("user_public_profiles").select("id, username, full_name").in("id", actorIds);
    for (const row of (data ?? []) as Array<{ id: string; username: string | null; full_name: string | null }>) raw.names.set(row.id, row.username ? `@${row.username}` : row.full_name ?? "Someone");
  }
  return buildActivityItems(raw);
}
