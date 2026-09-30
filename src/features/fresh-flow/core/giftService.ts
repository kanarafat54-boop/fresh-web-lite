import { supabase } from "../../../lib/supabase";
import { treasuryClient } from "../../../core/treasury/TreasuryClient";
import { callTreasuryServer } from "../../../core/treasury/treasuryServer";

export type GiftTotal = { count: number; totalMinor: string };

/**
 * Sends a real Fresh Coin tip on a Short via the same server-authorized
 * transfer RPC Wallet uses, then records a receipt in short_gifts so a real
 * per-Short gift count/total can be shown (not a fake decorative number).
 */
export async function sendGift(shortId: string, authorId: string, amountMinor: string): Promise<void> {
  const myAccountId = await treasuryClient.ensureUserAccount("FRESH", "fresh-coin", "Fresh Coin");

  const row = await callTreasuryServer<{ account_id: string; display_name: string } | null>(
    "resolve_recipient_by_id",
    { recipientId: authorId, assetCode: "FRESH" },
  );
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

  const receipt = {
    short_id: shortId,
    sender_id: senderId,
    recipient_id: authorId,
    amount_minor: amountMinor,
    transaction_id: transactionId,
  };

  // Treasury transfer and the media receipt live behind different boundaries.
  // If the receipt write hits a transient network/database failure, retry it
  // before reporting the gift as failed so the UI cannot claim a successful
  // payment was lost merely because the second write was transient.
  let lastReceiptError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error: giftError } = await supabase.from("short_gifts").insert(receipt);
    if (!giftError) return;
    lastReceiptError = giftError.message;
    if (attempt < 2) {
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw new Error(
    `Gift transfer completed, but Fresh could not record the receipt yet. Please retry the receipt sync. ${lastReceiptError ?? ""}`.trim(),
  );
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
