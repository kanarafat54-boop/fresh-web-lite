import { supabase } from "../../../lib/supabase";

export type ActivityKind = "like" | "comment" | "follow" | "gift" | "system";
export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  actorId: string | null;
  actorName: string;
  text: string;
  detail?: string;
  shortId?: string;
  unread: boolean;
};

const LIMIT = 40;

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

/**
 * Real activity on the signed-in creator's Shorts, read from existing tables:
 * likes, comments, new followers, gifts, plus their own `notifications` rows.
 * Nothing is invented; an empty account gets an empty list.
 */
export async function loadShortsActivity(userId: string): Promise<ActivityItem[]> {
  const { data: mine } = await supabase.from("shorts").select("id, caption").eq("author_id", userId).limit(200);
  const myShorts = (mine ?? []) as Array<{ id: string; caption: string | null }>;
  const ids = myShorts.map((short) => short.id);
  const caption = new Map(myShorts.map((short) => [short.id, short.caption ?? ""]));

  const [likes, comments, gifts, follows, system] = await Promise.all([
    ids.length ? supabase.from("short_likes").select("short_id, user_id, created_at, reaction_type").in("short_id", ids).neq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("short_comments").select("id, short_id, author_id, content, created_at").in("short_id", ids).neq("author_id", userId).order("created_at", { ascending: false }).limit(LIMIT) : Promise.resolve({ data: [] }),
    supabase.from("short_gifts").select("id, short_id, sender_id, amount_minor, created_at").eq("recipient_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    supabase.from("follows").select("follower_id, created_at").eq("followed_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    supabase.from("notifications").select("id, title, body, read_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
  ]);

  const likeRows = ((likes as any).data ?? []) as any[];
  const commentRows = ((comments as any).data ?? []) as any[];
  const giftRows = ((gifts as any).data ?? []) as any[];
  const followRows = ((follows as any).data ?? []) as any[];
  const systemRows = ((system as any).data ?? []) as any[];

  const actorIds = [...new Set([...likeRows.map((r) => r.user_id), ...commentRows.map((r) => r.author_id), ...giftRows.map((r) => r.sender_id), ...followRows.map((r) => r.follower_id)].filter(Boolean))];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const { data } = await supabase.from("user_public_profiles").select("id, username, full_name").in("id", actorIds);
    for (const row of (data ?? []) as any[]) names.set(row.id, row.username ? `@${row.username}` : row.full_name ?? "Someone");
  }
  const who = (id: string) => names.get(id) ?? "Someone";
  const snippet = (id: string) => caption.get(id) || "your Short";

  const items: ActivityItem[] = [
    ...likeRows.map((r): ActivityItem => ({ id: `like-${r.short_id}-${r.user_id}`, kind: "like", at: r.created_at, actorId: r.user_id, actorName: who(r.user_id), text: `${who(r.user_id)} ${r.reaction_type && r.reaction_type !== "like" ? `reacted (${r.reaction_type}) to` : "liked"} ${snippet(r.short_id)}`, shortId: r.short_id, unread: false })),
    ...commentRows.map((r): ActivityItem => ({ id: `comment-${r.id}`, kind: "comment", at: r.created_at, actorId: r.author_id, actorName: who(r.author_id), text: `${who(r.author_id)} commented on ${snippet(r.short_id)}`, detail: r.content ?? undefined, shortId: r.short_id, unread: false })),
    ...giftRows.map((r): ActivityItem => ({ id: `gift-${r.id}`, kind: "gift", at: r.created_at, actorId: r.sender_id, actorName: who(r.sender_id), text: `${who(r.sender_id)} sent a gift on ${snippet(r.short_id)}`, shortId: r.short_id, unread: false })),
    ...followRows.map((r): ActivityItem => ({ id: `follow-${r.follower_id}`, kind: "follow", at: r.created_at, actorId: r.follower_id, actorName: who(r.follower_id), text: `${who(r.follower_id)} followed you`, unread: false })),
    ...systemRows.map((r): ActivityItem => ({ id: `system-${r.id}`, kind: "system", at: r.created_at, actorId: null, actorName: "Fresh", text: r.title ?? "Notification", detail: r.body ?? undefined, unread: !r.read_at })),
  ];
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 80);
}
