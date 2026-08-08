import type { LedgerEntry, LedgerTransaction } from "./types";

export class LedgerInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerInvariantError";
  }
}

/**
 * Validates a double-entry transaction before it reaches persistent storage.
 * Monetary values are represented as bigint minor units to avoid floating-point
 * rounding. Persistence and settlement are deliberately outside this class.
 */
export function assertBalancedTransaction(entries: LedgerEntry[]): void {
  if (entries.length < 2) {
    throw new LedgerInvariantError("A ledger transaction requires at least two entries");
  }

  let debits = 0n;
  let credits = 0n;

  for (const entry of entries) {
    if (entry.amountMinor <= 0n) {
      throw new LedgerInvariantError("Ledger amounts must be positive minor units");
    }

    if (entry.direction === "debit") debits += entry.amountMinor;
    else credits += entry.amountMinor;
  }

  if (debits !== credits) {
    throw new LedgerInvariantError("Ledger transaction is not balanced");
  }
}

export function validateTransaction(transaction: LedgerTransaction): LedgerTransaction {
  if (!transaction.id || !transaction.reference || !transaction.createdBy) {
    throw new LedgerInvariantError("Ledger transaction is missing required identity fields");
  }

  assertBalancedTransaction(transaction.entries);
  return transaction;
}
