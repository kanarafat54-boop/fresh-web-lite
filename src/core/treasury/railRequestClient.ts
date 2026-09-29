import { supabase } from "../../lib/supabase";
import { callTreasuryServer } from "./treasuryServer";
import type { PaymentMethodDef } from "./paymentRails";
import { RAILS_SANDBOX_MODE } from "./paymentRails";

export type RailRequestRow = {
  id: string;
  direction: "deposit" | "withdrawal";
  method_id: string;
  family: string;
  amount_minor: string;
  currency_code: string;
  status: string;
  created_at: string;
  failure_reason: string | null;
};

export class RailRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RailRequestError";
  }
}

export type CreateRailResult = {
  requestId: string;
  ledgerTransactionId?: string;
  status: string;
  sandbox: boolean;
};

/**
 * Creates a deposit/withdrawal intent and, in sandbox mode, immediately
 * settles it on the double-entry ledger so balances update.
 * Real processor adapters will replace auto-settle once merchant keys exist.
 */
export async function createRailRequest(params: {
  method: PaymentMethodDef;
  direction: "deposit" | "withdrawal";
  amountMinor: string;
  currencyCode: string;
  metadata?: Record<string, unknown>;
}): Promise<CreateRailResult> {
  if (!/^\d+$/.test(params.amountMinor) || BigInt(params.amountMinor) <= 0n) {
    throw new RailRequestError("Amount must be a positive integer in minor units");
  }

  const meta = {
    ...(params.metadata ?? {}),
    sandbox: RAILS_SANDBOX_MODE,
    rail_status: params.method.status,
  };

  if (RAILS_SANDBOX_MODE) {
    let row: {
      request_id: string;
      ledger_transaction_id: string;
      status: string;
      sandbox: boolean;
    };
    try {
      row = await callTreasuryServer<typeof row>("create_and_sandbox_settle_rail_request", {
        direction: params.direction,
        methodId: params.method.id,
        family: params.method.family,
        amountMinor: params.amountMinor,
        currencyCode: params.currencyCode,
        instrumentId: null,
        metadata: meta,
      });
    } catch (error) {
      throw new RailRequestError(error instanceof Error ? error.message : "Rail request failed");
    }
    if (!row) throw new RailRequestError("Rail request was not created");

    return {
      requestId: row.request_id,
      ledgerTransactionId: row.ledger_transaction_id,
      status: row.status ?? "settled",
      sandbox: true,
    };
  }

  try {
    const data = await callTreasuryServer<string>("create_rail_request", {
      direction: params.direction,
      methodId: params.method.id,
      family: params.method.family,
      amountMinor: params.amountMinor,
      currencyCode: params.currencyCode,
      instrumentId: null,
      metadata: meta,
    });
    if (!data) throw new RailRequestError("Rail request was not created");
    return { requestId: data, status: "pending", sandbox: false };
  } catch (error) {
    throw new RailRequestError(error instanceof Error ? error.message : "Rail request failed");
  }
}

export async function listMyRailRequests(limit = 20): Promise<RailRequestRow[]> {
  const { data, error } = await supabase
    .from("treasury_rail_requests")
    .select("id, direction, method_id, family, amount_minor, currency_code, status, created_at, failure_reason")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new RailRequestError(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    amount_minor: String(row.amount_minor),
  })) as RailRequestRow[];
}
