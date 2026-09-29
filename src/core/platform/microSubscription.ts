/**
 * Smart Sponsor & Micro-Subscription Marketplace contracts.
 * Fits: Studio brand deals · Marketplace · Wallet/Treasury.
 *
 * Micro-transactions (one-time unlocks) and brand escrow are state machines only.
 * Settlement adapters (Stripe webhooks / treasury_entries) plug in without inventing balances.
 */

export type MicroUnlockStatus = "pending" | "authorized" | "fulfilled" | "refunded" | "failed";

export type MicroUnlock = {
  id: string;
  buyerId: string;
  sellerId: string;
  assetId: string;
  assetKind: "course" | "series" | "video" | "bundle" | "other";
  amountMinor: number;
  currency: string;
  status: MicroUnlockStatus;
  provider: "stripe" | "treasury" | "sandbox";
  createdAt: string;
  updatedAt: string;
};

export function createMicroUnlock(input: {
  buyerId: string;
  sellerId: string;
  assetId: string;
  assetKind?: MicroUnlock["assetKind"];
  amountMinor: number;
  currency?: string;
  provider?: MicroUnlock["provider"];
}): MicroUnlock {
  if (!input.buyerId || !input.sellerId || input.buyerId === input.sellerId) {
    throw new Error("Micro-unlock requires distinct buyer and seller.");
  }
  if (!input.assetId || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Micro-unlock requires asset and positive amount (minor units).");
  }
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    assetId: input.assetId,
    assetKind: input.assetKind ?? "video",
    amountMinor: input.amountMinor,
    currency: (input.currency ?? "UGX").toUpperCase(),
    status: "pending",
    provider: input.provider ?? "sandbox",
    createdAt: now,
    updatedAt: now,
  };
}

export function authorizeMicroUnlock(record: MicroUnlock): MicroUnlock {
  if (record.status !== "pending") return record;
  return { ...record, status: "authorized", updatedAt: new Date().toISOString() };
}

export function fulfillMicroUnlock(record: MicroUnlock): MicroUnlock {
  if (record.status !== "authorized") return record;
  return { ...record, status: "fulfilled", updatedAt: new Date().toISOString() };
}

export function refundMicroUnlock(record: MicroUnlock): MicroUnlock {
  if (record.status === "fulfilled" || record.status === "refunded") {
    return { ...record, status: "refunded", updatedAt: new Date().toISOString() };
  }
  return { ...record, status: "failed", updatedAt: new Date().toISOString() };
}

/** Brand deal path reuses escrowLedger; this documents the handoff surface only. */
export const BRAND_DEAL_FLOW = [
  "BrandEscrowDeposit",
  "MilestoneVerificationService",
  "CreatorPayoutEngine",
] as const;
