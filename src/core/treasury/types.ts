export type TreasuryScope = "platform" | "owner" | "user";

export type AssetKind = "fiat" | "crypto" | "fresh-coin" | "token";

export type AccountKind =
  | "asset"
  | "liability"
  | "revenue"
  | "expense"
  | "equity";

export type LedgerAccount = {
  id: string;
  ownerId: string;
  scope: TreasuryScope;
  kind: AccountKind;
  assetCode: string;
  assetKind: AssetKind;
  displayName: string;
  active: boolean;
};

export type LedgerEntry = {
  accountId: string;
  amountMinor: bigint;
  direction: "debit" | "credit";
};

export type LedgerTransaction = {
  id: string;
  reference: string;
  createdAt: string;
  createdBy: string;
  description: string;
  entries: LedgerEntry[];
  metadata?: Record<string, string>;
};

export type TreasuryBucket = {
  scope: TreasuryScope;
  ownerId: string;
  accountId: string;
  assetCode: string;
  assetKind: AssetKind;
};

/** Exact integer monetary quantity in the smallest supported unit. */
export type MinorUnits = bigint;

export type RevenueAllocation = {
  grossAmount: MinorUnits;
  ownerAmount: MinorUnits;
  platformAmount: MinorUnits;
  currency: string;
};

/**
 * A movement is not considered settled merely because the UI requested it.
 * Settlement must be confirmed by a trusted ledger/rail adapter.
 */
export type SettlementStatus =
  | "requested"
  | "authorized"
  | "submitted"
  | "settled"
  | "reversed"
  | "rejected";

export type TransferAuthorization = {
  actorId: string;
  challengeId: string;
  method: "password" | "passkey" | "biometric" | "recovery";
  authorizedAt: string;
};

export type TreasuryTransfer = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  assetCode: string;
  amountMinor: bigint;
  status: SettlementStatus;
  authorization?: TransferAuthorization;
  createdAt: string;
};

export type TreasuryOwnership = {
  platformRevenueAccountId: string;
  ownerRevenueAccountId: string;
  ownerId: string;
};
