import { supabase } from "../../lib/supabase";

export type TreasuryAssetKind = "fiat" | "crypto" | "fresh-coin" | "token";

export type TreasuryBalance = {
  account_id: string;
  asset_code: string;
  asset_kind: TreasuryAssetKind;
  display_name: string;
  /** PostgreSQL bigint is kept as text at the browser boundary. */
  balance_minor: string;
};

export type TreasuryAccount = {
  id: string;
  owner_id: string;
  scope: "user";
  kind: "asset";
  asset_code: string;
  asset_kind: TreasuryAssetKind;
  display_name: string;
  active: boolean;
};

export class TreasuryClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TreasuryClientError";
  }
}

/**
 * Browser-side boundary for Fresh Treasury.
 *
 * It never computes authoritative balances, never writes ledger entries
 * directly, and never receives a service-role credential. Supabase RPCs
 * enforce ownership, concurrency, and accounting rules server-side.
 */
export class TreasuryClient {
  async ensureUserAccount(
    assetCode: string,
    assetKind: TreasuryAssetKind,
    displayName?: string,
  ): Promise<string> {
    const { data, error } = await supabase.rpc("treasury_ensure_user_account", {
      p_asset_code: assetCode,
      p_asset_kind: assetKind,
      p_display_name: displayName ?? null,
    });

    if (error) throw new TreasuryClientError(error.message);
    if (!data) throw new TreasuryClientError("Treasury account was not created");

    return data as string;
  }

  async getMyBalances(): Promise<TreasuryBalance[]> {
    const { data, error } = await supabase
      .from("treasury_my_balances")
      .select("account_id, asset_code, asset_kind, display_name, balance_minor")
      .order("asset_code");

    if (error) throw new TreasuryClientError(error.message);

    return (data ?? []).map((row) => ({
      ...row,
      balance_minor: String(row.balance_minor),
    })) as TreasuryBalance[];
  }

  async getMyAccounts(): Promise<TreasuryAccount[]> {
    const { data, error } = await supabase
      .from("treasury_accounts")
      .select("id, owner_id, scope, kind, asset_code, asset_kind, display_name, active")
      .eq("scope", "user")
      .eq("active", true)
      .order("asset_code");

    if (error) throw new TreasuryClientError(error.message);

    return (data ?? []) as TreasuryAccount[];
  }

  async transferInternal(params: {
    fromAccountId: string;
    toAccountId: string;
    amountMinor: string;
    idempotencyKey: string;
    description?: string;
  }): Promise<string> {
    if (!/^\d+$/.test(params.amountMinor) || BigInt(params.amountMinor) <= 0n) {
      throw new TreasuryClientError("Transfer amount must be a positive integer minor-unit value");
    }
    if (params.idempotencyKey.trim().length < 8) {
      throw new TreasuryClientError("A strong idempotency key is required");
    }

    const { data, error } = await supabase.rpc("treasury_transfer_internal", {
      p_from_account_id: params.fromAccountId,
      p_to_account_id: params.toAccountId,
      p_amount_minor: params.amountMinor,
      p_idempotency_key: params.idempotencyKey,
      p_description: params.description ?? "Fresh internal transfer",
    });

    if (error) throw new TreasuryClientError(error.message);
    if (!data) throw new TreasuryClientError("Treasury transfer did not return a transaction id");

    return data as string;
  }
}

export const treasuryClient = new TreasuryClient();
