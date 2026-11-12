/**
 * Pure model for the Shorts notifications feed. The loader in shortsActivity.ts reads the rows; everything that
 * decides what the viewer is told lives here so it can be tested. Only real rows become items, and the viewer's
 * own actions never notify them.
 */
export type ActivityKind = "like" | "comment" | "reply" | "reaction" | "mention" | "moderation" | "creator-update" | "repost" | "remix" | "follow" | "gift" | "system";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  actorId: string | null;
  actorName: string;
  text: string;
  detail?: string;
  shortId?: string;
  /** Set on moderation items the viewer can appeal. */
  appeal?: { targetType: "short" | "short_comment"; targetId: string };
  unread: boolean;
};

/** Categories from the specification (9.1): All, Reactions, Comments, Replies, Mentions, New followers, Creator updates. */
export type ActivityTab = "all" | "reactions" | "comments" | "replies" | "mentions" | "followers" | "creator";

export const ACTIVITY_TABS: Array<{ id: ActivityTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "reactions", label: "Reactions" },
  { id: "comments", label: "Comments" },
  { id: "replies", label: "Replies" },
  { id: "mentions", label: "Mentions" },
  { id: "followers", label: "New followers" },
  { id: "creator", label: "Creator updates" },
];

const TAB_KINDS: Record<ActivityTab, ActivityKind[] | null> = {
  all: null,
  reactions: ["like", "reaction"],
  comments: ["comment", "moderation"],
  replies: ["reply"],
  mentions: ["mention"],
  followers: ["follow"],
  creator: ["creator-update", "repost", "remix", "gift", "system"],
};

export function matchesTab(kind: ActivityKind, tab: ActivityTab): boolean {
  const kinds = TAB_KINDS[tab];
  return kinds === null || kinds.includes(kind);
}

export function timeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

export type RawActivity = {
  viewerId: string;
  /** Viewer's Shorts: id -> caption. */
  captions: Map<string, string>;
  /** Viewer's own comments (anywhere): id -> { short_id, content }. */
  myComments: Map<string, { short_id: string; content: string | null; moderation_state?: string | null; moderation_reason?: string | null; moderated_at?: string | null }>;
  /** Viewer's username without "@", used to find mentions. */
  myUsername: string | null;
  /** Author of each Short that appears in replies, to tell creator replies apart. */
  shortAuthors: Map<string, string>;
  /** Comments anywhere whose text contains the viewer's @username. */
  mentions: Array<{ id: string; short_id: string; author_id: string; content: string | null; created_at: string; moderation_state?: string | null }>;
  /** Recent Shorts from creators the viewer follows. */
  followedShorts: Array<{ id: string; author_id: string; created_at: string; caption: string | null }>;
  names: Map<string, string>;
  /** Viewer's Shorts a reviewer hid. Empty until the moderation update is live. */
  hiddenShorts?: Array<{ id: string; caption: string | null; moderation_reason: string | null; moderated_at: string | null }>;
  likes: Array<{ short_id: string; user_id: string; created_at: string; reaction_type: string | null }>;
  comments: Array<{ id: string; short_id: string; author_id: string; content: string | null; created_at: string; parent_id: string | null; moderation_state?: string | null }>;
  replies: Array<{ id: string; short_id: string; author_id: string; content: string | null; created_at: string; parent_id: string | null; moderation_state?: string | null }>;
  commentReactions: Array<{ comment_id: string; user_id: string; reaction_type: string | null; created_at: string }>;
  reposts: Array<{ short_id: string; user_id: string; created_at: string }>;
  remixes: Array<{ id: string; author_id: string; created_at: string; remix_of_short_id: string | null; duet_of_short_id: string | null }>;
  gifts: Array<{ id: string; short_id: string; sender_id: string; created_at: string }>;
  follows: Array<{ follower_id: string; created_at: string }>;
  system: Array<{ id: string; title: string | null; body: string | null; read_at: string | null; created_at: string }>;
};

const shown = (state: string | null | undefined) => state === undefined || state === null || state === "visible";
const valid = (iso: string) => Number.isFinite(Date.parse(iso));

export function buildActivityItems(raw: RawActivity, limit = 80): ActivityItem[] {
  const who = (id: string) => raw.names.get(id) ?? "Someone";
  const snippet = (shortId: string) => raw.captions.get(shortId) || "your Short";
  const items: ActivityItem[] = [];

  for (const r of raw.likes) {
    if (r.user_id === raw.viewerId || !valid(r.created_at)) continue;
    const verb = r.reaction_type && r.reaction_type !== "like" ? `reacted (${r.reaction_type}) to` : "liked";
    items.push({ id: `like-${r.short_id}-${r.user_id}`, kind: "like", at: r.created_at, actorId: r.user_id, actorName: who(r.user_id), text: `${who(r.user_id)} ${verb} ${snippet(r.short_id)}`, shortId: r.short_id, unread: false });
  }

  const replyIds = new Set<string>();
  for (const r of raw.replies) {
    if (r.author_id === raw.viewerId || !valid(r.created_at) || !shown(r.moderation_state)) continue;
    if (!r.parent_id || !raw.myComments.has(r.parent_id)) continue;
    replyIds.add(r.id);
    const byCreator = raw.shortAuthors.get(r.short_id) === r.author_id;
    items.push({ id: `reply-${r.id}`, kind: "reply", at: r.created_at, actorId: r.author_id, actorName: who(r.author_id), text: `${who(r.author_id)} ${byCreator ? "(the creator) " : ""}replied to your comment`, detail: r.content ?? undefined, shortId: r.short_id, unread: false });
  }
  const mentionIds = new Set<string>();
  const handle = raw.myUsername ? raw.myUsername.replace(/^@/, "") : "";
  const mentionPattern = handle ? new RegExp(`(^|[^\\w])@${handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i") : null;
  for (const r of raw.mentions) {
    if (!mentionPattern || r.author_id === raw.viewerId || !valid(r.created_at) || !shown(r.moderation_state) || replyIds.has(r.id) || !mentionPattern.test(r.content ?? "")) continue;
    mentionIds.add(r.id);
    items.push({ id: `mention-${r.id}`, kind: "mention", at: r.created_at, actorId: r.author_id, actorName: who(r.author_id), text: `${who(r.author_id)} mentioned you in a comment`, detail: r.content ?? undefined, shortId: r.short_id, unread: false });
  }
  for (const r of raw.comments) {
    // A reply to the viewer's comment is reported once, as a reply, not again as a comment on their Short.
    if (r.author_id === raw.viewerId || !valid(r.created_at) || !shown(r.moderation_state) || replyIds.has(r.id) || mentionIds.has(r.id)) continue;
    items.push({ id: `comment-${r.id}`, kind: "comment", at: r.created_at, actorId: r.author_id, actorName: who(r.author_id), text: `${who(r.author_id)} commented on ${snippet(r.short_id)}`, detail: r.content ?? undefined, shortId: r.short_id, unread: false });
  }

  for (const [id, mine] of raw.myComments) {
    const state = mine.moderation_state;
    if (!state || state === "visible" || !mine.moderated_at || !valid(mine.moderated_at)) continue;
    items.push({ id: `moderation-${id}`, kind: "moderation", at: mine.moderated_at, actorId: null, actorName: "Fresh", text: state === "removed" ? "Your comment was removed" : "Your comment was hidden", detail: mine.moderation_reason ?? mine.content ?? undefined, shortId: mine.short_id, appeal: state === "hidden" || state === "removed" ? { targetType: "short_comment", targetId: id } : undefined, unread: false });
  }

  for (const hidden of raw.hiddenShorts ?? []) {
    if (!hidden.moderated_at || !valid(hidden.moderated_at)) continue;
    items.push({ id: `moderation-short-${hidden.id}`, kind: "moderation", at: hidden.moderated_at, actorId: null, actorName: "Fresh", text: "Your Short was hidden", detail: hidden.moderation_reason ?? hidden.caption ?? undefined, shortId: hidden.id, appeal: { targetType: "short", targetId: hidden.id }, unread: false });
  }

  for (const r of raw.commentReactions) {
    const mine = raw.myComments.get(r.comment_id);
    if (!mine || r.user_id === raw.viewerId || !valid(r.created_at)) continue;
    const verb = r.reaction_type && r.reaction_type !== "like" ? `reacted (${r.reaction_type}) to` : "liked";
    items.push({ id: `reaction-${r.comment_id}-${r.user_id}`, kind: "reaction", at: r.created_at, actorId: r.user_id, actorName: who(r.user_id), text: `${who(r.user_id)} ${verb} your comment`, detail: mine.content ?? undefined, shortId: mine.short_id, unread: false });
  }

  for (const r of raw.reposts) {
    if (r.user_id === raw.viewerId || !valid(r.created_at)) continue;
    items.push({ id: `repost-${r.short_id}-${r.user_id}`, kind: "repost", at: r.created_at, actorId: r.user_id, actorName: who(r.user_id), text: `${who(r.user_id)} reposted ${snippet(r.short_id)}`, shortId: r.short_id, unread: false });
  }

  for (const r of raw.remixes) {
    const sourceId = r.remix_of_short_id ?? r.duet_of_short_id;
    if (!sourceId || r.author_id === raw.viewerId || !valid(r.created_at)) continue;
    const verb = r.remix_of_short_id ? "remixed" : "made a duet with";
    items.push({ id: `remix-${r.id}`, kind: "remix", at: r.created_at, actorId: r.author_id, actorName: who(r.author_id), text: `${who(r.author_id)} ${verb} ${snippet(sourceId)}`, shortId: r.id, unread: false });
  }

  for (const r of raw.followedShorts) {
    if (r.author_id === raw.viewerId || !valid(r.created_at)) continue;
    items.push({ id: `creator-update-${r.id}`, kind: "creator-update", at: r.created_at, actorId: r.author_id, actorName: who(r.author_id), text: `${who(r.author_id)} published a new Short`, detail: r.caption ?? undefined, shortId: r.id, unread: false });
  }
  for (const r of raw.gifts) {
    if (!valid(r.created_at)) continue;
    items.push({ id: `gift-${r.id}`, kind: "gift", at: r.created_at, actorId: r.sender_id, actorName: who(r.sender_id), text: `${who(r.sender_id)} sent a gift on ${snippet(r.short_id)}`, shortId: r.short_id, unread: false });
  }
  for (const r of raw.follows) {
    if (r.follower_id === raw.viewerId || !valid(r.created_at)) continue;
    items.push({ id: `follow-${r.follower_id}`, kind: "follow", at: r.created_at, actorId: r.follower_id, actorName: who(r.follower_id), text: `${who(r.follower_id)} followed you`, unread: false });
  }
  for (const r of raw.system) {
    if (!valid(r.created_at)) continue;
    items.push({ id: `system-${r.id}`, kind: "system", at: r.created_at, actorId: null, actorName: "Fresh", text: r.title ?? "Notification", detail: r.body ?? undefined, unread: !r.read_at });
  }

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}
