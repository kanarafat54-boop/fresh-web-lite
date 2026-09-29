import { supabase } from "../../lib/supabase";

export async function requireFreshAuthenticatedUser(expectedUserId?: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required.");
  if (expectedUserId && data.user.id !== expectedUserId) throw new Error("Authenticated identity does not match this action.");
  return data.user;
}

export async function runFreshAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Fresh action failed.");
  }
}
