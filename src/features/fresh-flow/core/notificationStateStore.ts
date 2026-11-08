import { supabase } from "../../../lib/supabase";
import { EMPTY_STATE, isMissingTableError, normalizeState, type NotificationState } from "./notificationState";

export type StateSource = "account" | "device";

const localKey = (userId: string) => `fresh-shorts-notification-state-${userId}`;

function readLocal(userId: string): NotificationState {
  try { return normalizeState(JSON.parse(localStorage.getItem(localKey(userId)) ?? "{}")); } catch { return EMPTY_STATE; }
}
function writeLocal(userId: string, state: NotificationState): void {
  try { localStorage.setItem(localKey(userId), JSON.stringify(state)); } catch { /* storage blocked: state lives for this visit only */ }
}

/**
 * Loads the viewer's notification state from their account when the table exists, otherwise from this device.
 * `source` tells the screen which one it is so it can say so honestly.
 */
export async function loadNotificationState(userId: string): Promise<{ state: NotificationState; source: StateSource }> {
  const { data, error } = await supabase.from("short_notification_state").select("last_read_at, cleared_before, read_ids, disabled_categories").eq("user_id", userId).maybeSingle();
  if (error) return { state: readLocal(userId), source: "device" };
  const row = data as { last_read_at: string | null; cleared_before: string | null; read_ids: string[] | null; disabled_categories: string[] | null } | null;
  return { state: row ? normalizeState({ lastReadAt: row.last_read_at, clearedBefore: row.cleared_before, readIds: row.read_ids, disabledCategories: row.disabled_categories }) : EMPTY_STATE, source: "account" };
}

/** Saves to the account when possible, falling back to this device. Returns where it was saved. */
export async function saveNotificationState(userId: string, state: NotificationState, source: StateSource): Promise<StateSource> {
  if (source === "account") {
    const { error } = await supabase.from("short_notification_state").upsert({
      user_id: userId,
      last_read_at: state.lastReadAt,
      cleared_before: state.clearedBefore,
      read_ids: state.readIds,
      disabled_categories: state.disabledCategories,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (!error) return "account";
    if (!isMissingTableError(error)) { writeLocal(userId, state); return "device"; }
  }
  writeLocal(userId, state);
  return "device";
}
