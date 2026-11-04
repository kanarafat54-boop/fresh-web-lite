/** Pure comment helpers: sorting, @mention parsing and insertion. */

export type CommentSortMode = "relevant" | "newest" | "liked" | "oldest";

type Sortable = { id: string; created_at: string };

/** Sorts root comments (replies stay threaded under their root). "relevant" is handled by the signal ranker. */
export function sortCommentRoots<T extends Sortable>(roots: readonly T[], mode: Exclude<CommentSortMode, "relevant">, likesOf: (id: string) => number): T[] {
  const copy = [...roots];
  if (mode === "newest") return copy.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  if (mode === "liked") return copy.sort((a, b) => likesOf(b.id) - likesOf(a.id) || Date.parse(b.created_at) - Date.parse(a.created_at));
  return copy.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

/** The partial @name being typed at the end of the draft, or null. */
export function mentionQueryAt(draft: string): string | null {
  const match = /(?:^|\s)@([\p{L}\p{N}_]{1,30})$/u.exec(draft);
  return match ? match[1] : null;
}

export function insertMention(draft: string, username: string): string {
  return draft.replace(/(^|\s)@[\p{L}\p{N}_]{1,30}$/u, `$1@${username} `);
}

export type MentionPart = { text: string; mention?: string };

export function splitMentions(content: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of content.matchAll(/(^|\s)(@([\p{L}\p{N}_]{1,30}))/gu)) {
    const start = (match.index ?? 0) + match[1].length;
    if (start > last) parts.push({ text: content.slice(last, start) });
    parts.push({ text: match[2], mention: match[3] });
    last = start + match[2].length;
  }
  if (last < content.length) parts.push({ text: content.slice(last) });
  return parts;
}
