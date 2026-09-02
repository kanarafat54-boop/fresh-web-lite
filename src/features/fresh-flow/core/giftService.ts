import { supabase } from "../../../lib/supabase";
import { treasuryClient } from "../../../core/treasury/TreasuryClient";

export type GiftTotal = { count: number; totalMinor: string };

/**
 * Sends a real Fresh Coin tip on a Short via the same server-authorized
 * transfer RPC Wallet uses, then records a receipt in short_gifts so a real
 * per-Short gift count/total can be shown (not a fake decorative number).
 */
export async function sendGift(shortId: string, authorId: string, amountMinor: string): Promise<void> {
  const myAccountId = await treasuryClient.ensureUserAccount("FRESH", "fresh-coin", "Fresh Coin");

  const { data, error } = await supabase.rpc("treasury_resolve_recipient_by_id", {
    p_recipient_id: authorId,
    p_asset_code: "FRESH",
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("This creator doesn't have a Fresh Coin account yet.");

  const transactionId = await treasuryClient.transferInternal({
    fromAccountId: myAccountId,
    toAccountId: row.account_id as string,
    amountMinor,
    idempotencyKey: crypto.randomUUID(),
    description: "Gift on a Fresh Short",
  });

  const { data: authData } = await supabase.auth.getUser();
  const senderId = authData.user?.id;
  if (!senderId) throw new Error("You must be signed in to gift.");

  const { error: giftError } = await supabase.from("short_gifts").insert({
    short_id: shortId,
    sender_id: senderId,
    recipient_id: authorId,
    amount_minor: amountMinor,
    transaction_id: transactionId,
  });
  if (giftError) throw new Error(`Gift sent, but wasn't recorded on this Short: ${giftError.message}`);
}

export async function getGiftTotals(shortIds: string[]): Promise<Map<string, GiftTotal>> {
  if (shortIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("short_gift_totals")
    .select("short_id, gift_count, total_minor")
    .in("short_id", shortIds);
  if (error) throw new Error(error.message);
  return new Map(
    (data ?? []).map((row: any) => [row.short_id as string, { count: row.gift_count as number, totalMinor: String(row.total_minor) }]),
  );
}
