export type EscrowStatus = "funded" | "milestone-pending" | "released" | "disputed" | "refunded";

export type EscrowRecord = {
  id: string;
  payerId: string;
  payeeId: string;
  amountMinor: number;
  currency: string;
  milestone: string;
  status: EscrowStatus;
};

export function fundEscrow(input: Omit<EscrowRecord, "id" | "status">): EscrowRecord {
  return { ...input, id: crypto.randomUUID(), status: "funded" };
}

export function verifyMilestone(record: EscrowRecord): EscrowRecord {
  if (record.status !== "funded" && record.status !== "milestone-pending") return record;
  return { ...record, status: "milestone-pending" };
}

export function releaseEscrow(record: EscrowRecord): EscrowRecord {
  if (record.status !== "milestone-pending") return record;
  return { ...record, status: "released" };
}

export function disputeEscrow(record: EscrowRecord): EscrowRecord {
  if (record.status === "released" || record.status === "refunded") return record;
  return { ...record, status: "disputed" };
}
