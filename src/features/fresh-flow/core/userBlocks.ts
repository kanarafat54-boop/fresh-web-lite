/**
 * Block (spec 10.4). Pure helpers; the database enforces what a blocked account can do (comment, reply, follow),
 * and the app hides blocked accounts from the blocker. A block is private: the blocked account is not told.
 */
export type BlockedAccount = { id: string; name: string; blockedAt: string };

export type BlockOutcome = "blocked" | "unavailable" | "failed";

/** What blocking does, in plain words. Shown before the viewer confirms, so it must match the migration. */
export const BLOCK_EFFECTS: readonly string[] = [
  "You will no longer see their Shorts, comments or activity.",
  "They will not be able to comment on your Shorts, reply to your comments or follow you.",
  "Any follows between you are removed.",
  "They are not told that you blocked them.",
  "They can still view your public Shorts, as anyone can.",
];

export function toBlockedSet(rows: ReadonlyArray<{ blocked_id?: unknown }>): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) if (row && typeof row.blocked_id === "string" && row.blocked_id) ids.add(row.blocked_id);
  return ids;
}

/** Drops items written by a blocked account. Items without an author are kept. */
export function withoutBlockedAuthors<T>(items: readonly T[], blocked: ReadonlySet<string>, authorOf: (item: T) => string | null | undefined): T[] {
  if (blocked.size === 0) return [...items];
  return items.filter((item) => {
    const author = authorOf(item);
    return !author || !blocked.has(author);
  });
}

/** True when a database error means the blocks table is not there yet (migration not applied). */
export function isBlocksUnavailable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /relation .* does not exist|could not find the table|schema cache/i.test(error.message ?? "");
}

/** Orders accounts newest block first and drops duplicates. */
export function sortBlocked(accounts: BlockedAccount[]): BlockedAccount[] {
  const seen = new Set<string>();
  return accounts
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => Date.parse(b.blockedAt) - Date.parse(a.blockedAt));
}
