import { supabase } from "../../lib/supabase";
import { getCurrentUserId } from "./connectionService";

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function listThread(otherUserId: string, limit = 100): Promise<DirectMessage[]> {
  const myId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("direct_messages")
    .select("id, sender_id, recipient_id, body, read_at, created_at")
    .or(`and(sender_id.eq.${myId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${myId})`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DirectMessage[];
}

export async function sendMessage(recipientId: string, body: string): Promise<DirectMessage> {
  const myId = await getCurrentUserId();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty.");
  if (myId === recipientId) throw new Error("You cannot message yourself.");

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({ sender_id: myId, recipient_id: recipientId, body: trimmed })
    .select("id, sender_id, recipient_id, body, read_at, created_at")
    .single();

  if (error) throw error;
  return data as DirectMessage;
}

export async function markThreadRead(otherUserId: string): Promise<void> {
  const myId = await getCurrentUserId();
  const { error } = await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherUserId)
    .eq("recipient_id", myId)
    .is("read_at", null);

  if (error) throw error;
}

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const myId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("direct_messages")
    .select("sender_id")
    .eq("recipient_id", myId)
    .is("read_at", null);

  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { sender_id: string }[]) {
    counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1;
  }
  return counts;
}
