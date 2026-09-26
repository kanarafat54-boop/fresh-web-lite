import { supabase } from "../../lib/supabase";
import type { PaymentMethodDef } from "./paymentRails";

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

/**
 * Creates a pending deposit or withdrawal intent.
 * Does not move ledger funds — settlement adapters credit/debit only after confirmation.
 */
export async function createRailRequest(params: {
  method: PaymentMethodDef;
  direction: "deposit" | "withdrawal";
  amountMinor: string;
  currencyCode: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (!/^\d+$/.test(params.amountMinor) || BigInt(params.amountMinor) <= 0n) {
    throw new RailRequestError("Amount must be a positive integer in minor units");
  }

  const { data, error } = await supabase.rpc("treasury_create_rail_request", {
    p_direction: params.direction,
    p_method_id: params.method.id,
    p_family: params.method.family,
    p_amount_minor: params.amountMinor,
    p_currency_code: params.currencyCode,
    p_instrument_id: null,
    p_metadata: params.metadata ?? {},
  });

  if (error) throw new RailRequestError(error.message);
  if (!data) throw new RailRequestError("Rail request was not created");
  return data as string;
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
