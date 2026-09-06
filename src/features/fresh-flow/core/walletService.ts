import { supabase } from "../../../lib/supabase";

export type WalletSummary = { balanceMinor: string; assetCode: string };

/**
 * Reads from the real Treasury ledger (treasury_my_balances -> derived from
 * ledger_transactions/ledger_entries), the same authoritative source
 * WalletDashboard uses -- not a separate, disconnected balance column.
 * A prior version read from an unrelated `wallets` table that had no
 * connection to actual treasury_transfer_internal money movement; that was
 * a real data-integrity bug, not just a style choice.
 * Returns null when the user has no funded Fresh Coin account yet (or is a
 * guest) -- callers render that honestly rather than showing a fake "$0.00".
 */
export async function getWalletSummary(userId: string): Promise<WalletSummary | null> {
  const { data, error } = await supabase
    .from("treasury_my_balances")
    .select("asset_code, balance_minor")
    .eq("asset_code", "FRESH")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { balanceMinor: String(data.balance_minor ?? "0"), assetCode: data.asset_code };
}

export function formatWalletBalance(summary: WalletSummary): string {
  try {
    const amount = BigInt(summary.balanceMinor);
    const sign = amount < 0n ? "-" : "";
    const absolute = amount < 0n ? -amount : amount;
    const whole = absolute / 100n;
    const minor = (absolute % 100n).toString().padStart(2, "0");
    return `${sign}${summary.assetCode} ${whole.toString()}.${minor}`;
  } catch {
    return `${summary.assetCode} —`;
  }
}
