/**
 * Read, clear and category preferences for the Shorts notification feed (spec 9.2, 3.11).
 *
 * The feed is derived from other tables, so there is no row to mark "read". Instead the viewer keeps a small
 * state: individual items they opened (`readIds`), a "mark all read" time (`lastReadAt`), a "clear" time
 * (`clearedBefore`, hides everything at or before it; newer activity still appears) and categories they switched
 * off. Switching a category off hides it from the feed; it does not stop the activity from happening.
 *
 * Delivery frequency (push, email, digest) is deliberately absent: there is no delivery service to control.
 */
import type { ActivityItem, ActivityTab } from "./shortsActivityModel.ts";
import { matchesTab } from "./shortsActivityModel.ts";

export type NotificationCategory = Exclude<ActivityTab, "all">;
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = ["reactions", "comments", "replies", "mentions", "followers", "creator"];

export type NotificationState = {
  lastReadAt: string | null;
  clearedBefore: string | null;
  readIds: string[];
  disabledCategories: NotificationCategory[];
};

export const MAX_READ_IDS = 300;

export const EMPTY_STATE: NotificationState = { lastReadAt: null, clearedBefore: null, readIds: [], disabledCategories: [] };

const isTime = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));

/** Accepts anything (a database row, parsed JSON, garbage) and returns a safe state. */
export function normalizeState(raw: unknown): NotificationState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const ids = Array.isArray(r.readIds) ? r.readIds.filter((id): id is string => typeof id === "string").slice(-MAX_READ_IDS) : [];
  const disabled = Array.isArray(r.disabledCategories) ? r.disabledCategories.filter((c): c is NotificationCategory => NOTIFICATION_CATEGORIES.includes(c as NotificationCategory)) : [];
  return {
    lastReadAt: isTime(r.lastReadAt) ? r.lastReadAt : null,
    clearedBefore: isTime(r.clearedBefore) ? r.clearedBefore : null,
    readIds: [...new Set(ids)],
    disabledCategories: [...new Set(disabled)],
  };
}

export function categoryOf(kind: ActivityItem["kind"]): NotificationCategory {
  return NOTIFICATION_CATEGORIES.find((category) => matchesTab(kind, category)) ?? "creator";
}

/** Items the viewer should see, with `unread` recomputed from their state. */
export function applyState(items: ActivityItem[], state: NotificationState): ActivityItem[] {
  const cleared = state.clearedBefore ? Date.parse(state.clearedBefore) : -Infinity;
  const lastRead = state.lastReadAt ? Date.parse(state.lastReadAt) : -Infinity;
  const read = new Set(state.readIds);
  return items
    .filter((item) => Date.parse(item.at) > cleared && !state.disabledCategories.includes(categoryOf(item.kind)))
    .map((item) => {
      const seen = read.has(item.id) || Date.parse(item.at) <= lastRead;
      // Account notifications also carry their own read flag from the database.
      const unread = item.kind === "system" ? item.unread && !seen : !seen;
      return { ...item, unread };
    });
}

export const unreadCount = (items: ActivityItem[]) => items.filter((item) => item.unread).length;

export function markRead(state: NotificationState, id: string): NotificationState {
  if (state.readIds.includes(id)) return state;
  return { ...state, readIds: [...state.readIds, id].slice(-MAX_READ_IDS) };
}

/** Marks everything currently in the feed as read. `now` must not be earlier than the newest item. */
export function markAllRead(state: NotificationState, now: Date = new Date()): NotificationState {
  return { ...state, lastReadAt: now.toISOString(), readIds: [] };
}

/** Hides everything up to now. Newer activity still appears. Also counts as read. */
export function clearAll(state: NotificationState, now: Date = new Date()): NotificationState {
  return { ...state, clearedBefore: now.toISOString(), lastReadAt: now.toISOString(), readIds: [] };
}

export function setCategoryEnabled(state: NotificationState, category: NotificationCategory, enabled: boolean): NotificationState {
  const rest = state.disabledCategories.filter((c) => c !== category);
  return { ...state, disabledCategories: enabled ? rest : [...rest, category] };
}

/** True when a database error means the state table is not there yet (migration not applied). */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /relation .* does not exist|could not find the table|schema cache/i.test(error.message ?? "");
}
