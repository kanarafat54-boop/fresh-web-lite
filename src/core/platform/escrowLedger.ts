export type EscrowStatus = "funded" | "milestone-pending" | "released" | "disputed" | "refunded";

export type EscrowRecord = {
  id: string;
  payerId: string;
  payeeId: string;
  amountMinor: number;
  currency: string;
  milestone: string;
  status: EscrowStatus;
  idempotencyKey?: string;
  createdAt?: string;
};

function assertEscrowInput(input: Omit<EscrowRecord, "id" | "status">) {
  if (!input.payerId || !input.payeeId || input.payerId === input.payeeId) throw new Error("Escrow requires distinct payer and payee.");
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Escrow amount must be a positive integer in minor units.");
  if (!input.currency.trim() || !input.milestone.trim()) throw new Error("Escrow currency and milestone are required.");
}

export function fundEscrow(input: Omit<EscrowRecord, "id" | "status">): EscrowRecord {
  assertEscrowInput(input);
  return { ...input, id: crypto.randomUUID(), status: "funded", createdAt: new Date().toISOString() };
}

export function verifyMilestone(record: EscrowRecord): EscrowRecord {
  if (record.status === "released" || record.status === "refunded") return record;
  if (record.status !== "funded" && record.status !== "milestone-pending") return record;
  return { ...record, status: "milestone-pending" };
}

/** Release funds after milestone. Accepts funded (auto-verifies) or milestone-pending. */
export function releaseEscrow(record: EscrowRecord): EscrowRecord {
  if (record.status === "released") return record;
  if (record.status === "refunded" || record.status === "disputed") return record;
  // funded → release so a single click never looks dead
  if (record.status === "funded" || record.status === "milestone-pending") {
    return { ...record, status: "released" };
  }
  return record;
}

export function disputeEscrow(record: EscrowRecord): EscrowRecord {
  if (record.status === "released" || record.status === "refunded") return record;
  return { ...record, status: "disputed" };
}

export function refundEscrow(record: EscrowRecord): EscrowRecord {
  if (record.status === "released") return record;
  return { ...record, status: "refunded" };
}
