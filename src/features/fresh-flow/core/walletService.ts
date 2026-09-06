import { supabase } from "../../../lib/supabase";

export type WalletSummary = { balance: number; currency: string };

/** Returns null when the user has no wallet row yet -- callers render that honestly. */
export async function getWalletSummary(userId: string): Promise<WalletSummary | null> {
  const { data, error } = await supabase.from("wallets").select("balance, currency").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { balance: Number(data.balance ?? 0), currency: data.currency || "USD" };
}

export function formatWalletBalance(summary: WalletSummary): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: summary.currency }).format(summary.balance);
  } catch {
    return `${summary.currency} ${summary.balance.toFixed(2)}`;
  }
}
