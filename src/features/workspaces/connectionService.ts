import { supabase } from "../../lib/supabase";

export type ConnectionRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type ConnectionRequest = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionRequestStatus;
  created_at: string;
  updated_at: string;
};

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("You must be signed in to use Fresh Connect.");
  return data.user.id;
}

export async function getConnectionRequest(recipientId: string): Promise<ConnectionRequest | null> {
  const requesterId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("connection_requests")
    .select("id, requester_id, recipient_id, status, created_at, updated_at")
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId)
    .maybeSingle();

  if (error) throw error;
  return data as ConnectionRequest | null;
}

export async function sendConnectionRequest(recipientId: string): Promise<ConnectionRequest> {
  const requesterId = await getCurrentUserId();
  if (requesterId === recipientId) throw new Error("You cannot connect with yourself.");

  const { data, error } = await supabase
    .from("connection_requests")
    .upsert(
      { requester_id: requesterId, recipient_id: recipientId, status: "pending" },
      { onConflict: "requester_id,recipient_id" },
    )
    .select("id, requester_id, recipient_id, status, created_at, updated_at")
    .single();

  if (error) throw error;
  return data as ConnectionRequest;
}

export async function cancelConnectionRequest(recipientId: string): Promise<void> {
  const requesterId = await getCurrentUserId();
  const { error } = await supabase
    .from("connection_requests")
    .update({ status: "cancelled" })
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId)
    .eq("status", "pending");

  if (error) throw error;
}

/** Pending requests where the current user is the recipient (awaiting my response). */
export async function listIncomingRequests(): Promise<ConnectionRequest[]> {
  const recipientId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("connection_requests")
    .select("id, requester_id, recipient_id, status, created_at, updated_at")
    .eq("recipient_id", recipientId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ConnectionRequest[];
}

export async function respondToConnectionRequest(requesterId: string, accept: boolean): Promise<void> {
  const recipientId = await getCurrentUserId();
  const { error } = await supabase
    .from("connection_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId)
    .eq("status", "pending");

  if (error) throw error;
}

/** The other user's id for every accepted connection involving the current user. */
export async function listAcceptedConnections(): Promise<string[]> {
  const myId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("connection_requests")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${myId},recipient_id.eq.${myId}`);

  if (error) throw error;
  const others = new Set<string>();
  for (const row of (data ?? []) as { requester_id: string; recipient_id: string }[]) {
    others.add(row.requester_id === myId ? row.recipient_id : row.requester_id);
  }
  return [...others];
}
