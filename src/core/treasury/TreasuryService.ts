import { assertBalancedTransaction } from "./ledger";
import type { LedgerAccount, LedgerTransaction, TreasuryOwnership } from "./types";

/**
 * Application-facing treasury boundary.
 *
 * This class intentionally does not manufacture balances or claim custody.
 * A production deployment must inject a persistent ledger and regulated
 * settlement adapters before funds can be deposited, withdrawn, or transferred.
 */
export class TreasuryService {
  private readonly accounts = new Map<string, LedgerAccount>();
  private readonly transactions: LedgerTransaction[] = [];

  registerAccount(account: LedgerAccount): void {
    if (this.accounts.has(account.id)) {
      throw new Error(`Treasury account already exists: ${account.id}`);
    }
    this.accounts.set(account.id, account);
  }

  getAccount(accountId: string): LedgerAccount | undefined {
    return this.accounts.get(accountId);
  }

  recordTransaction(transaction: LedgerTransaction): void {
    assertBalancedTransaction(transaction.entries);

    for (const entry of transaction.entries) {
      if (!this.accounts.has(entry.accountId)) {
        throw new Error(`Unknown treasury account: ${entry.accountId}`);
      }
    }

    this.transactions.push(transaction);
  }

  getTransactions(): readonly LedgerTransaction[] {
    return this.transactions;
  }

  createOwnershipSplit(
    ownerId: string,
    platformRevenueAccountId: string,
    ownerRevenueAccountId: string,
  ): TreasuryOwnership {
    const platform = this.accounts.get(platformRevenueAccountId);
    const owner = this.accounts.get(ownerRevenueAccountId);

    if (!platform || !owner) {
      throw new Error("Both platform and owner revenue accounts must exist");
    }
    if (platform.scope !== "platform" || owner.scope !== "owner") {
      throw new Error("Revenue accounts have invalid treasury scopes");
    }
    if (owner.ownerId !== ownerId) {
      throw new Error("Owner revenue account does not belong to the requested owner");
    }
    if (platform.assetCode !== owner.assetCode) {
      throw new Error("Ownership split accounts must use the same asset");
    }

    return { platformRevenueAccountId, ownerRevenueAccountId, ownerId };
  }
}

export const treasuryService = new TreasuryService();
