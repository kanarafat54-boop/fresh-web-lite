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

  const columns = "id, requester_id, recipient_id, status, created_at, updated_at";
  const { data: existing, error: lookupError } = await supabase
    .from("connection_requests")
    .select(columns)
    .eq("requester_id", requesterId)
    .eq("recipient_id", recipientId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  // An accepted connection is terminal from the requester's side. Returning it
  // makes this operation idempotent without attempting a forbidden status reset.
  if (existing?.status === "accepted" || existing?.status === "pending") {
    return existing as ConnectionRequest;
  }

  // A previously declined/cancelled request may be re-sent. Update only the
  // status column first; the Phase 0 grant intentionally forbids rewriting
  // requester_id/recipient_id through an upsert conflict-update path.
  if (existing) {
    const { data: restored, error: restoreError } = await supabase
      .from("connection_requests")
      .update({ status: "pending" })
      .eq("requester_id", requesterId)
      .eq("recipient_id", recipientId)
      .in("status", ["declined", "cancelled"])
      .select(columns)
      .maybeSingle();

    if (restoreError) throw restoreError;
    if (restored) return restored as ConnectionRequest;
  }

  const { data, error } = await supabase
    .from("connection_requests")
    .insert({ requester_id: requesterId, recipient_id: recipientId, status: "pending" })
    .select(columns)
    .single();

  // If two tabs send the same request concurrently, recover from the unique
  // constraint by reading the winning row instead of surfacing a false failure.
  if (error?.code === "23505") {
    const { data: concurrent, error: concurrentLookupError } = await supabase
      .from("connection_requests")
      .select(columns)
      .eq("requester_id", requesterId)
      .eq("recipient_id", recipientId)
      .maybeSingle();

    if (concurrentLookupError) throw concurrentLookupError;
    if (concurrent && (concurrent.status === "accepted" || concurrent.status === "pending")) {
      return concurrent as ConnectionRequest;
    }
  }

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
