import type { RevenueAllocation } from "./types";

export class RevenueAllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RevenueAllocationError";
  }
}

/**
 * Splits gross platform revenue into explicit owner and platform shares.
 * The function is deterministic and uses integer minor units only.
 */
export function allocateRevenue(
  grossAmount: bigint,
  ownerShareBps: bigint,
  currency: string,
): RevenueAllocation {
  if (grossAmount < 0n) {
    throw new RevenueAllocationError("Gross revenue cannot be negative");
  }

  if (ownerShareBps < 0n || ownerShareBps > 10_000n) {
    throw new RevenueAllocationError("Owner share must be between 0 and 10,000 basis points");
  }

  if (!currency.trim()) {
    throw new RevenueAllocationError("Revenue currency is required");
  }

  const ownerAmount = (grossAmount * ownerShareBps) / 10_000n;
  const platformAmount = grossAmount - ownerAmount;

  return {
    grossAmount,
    ownerAmount,
    platformAmount,
    currency,
  };
}
