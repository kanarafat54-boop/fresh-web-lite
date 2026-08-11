export type FreshAssetKind = "fiat" | "crypto" | "fresh-coin" | "token";

export type FreshAsset = {
  code: string;
  kind: FreshAssetKind;
  name: string;
  decimals: number;
};

export type FreshWalletAccount = {
  accountId: string;
  asset: FreshAsset;
  balanceMinor: bigint;
  availableMinor: bigint;
};

export type FreshTransferIntent = {
  fromAccountId: string;
  toAccountId: string;
  amountMinor: bigint;
  assetCode: string;
  idempotencyKey: string;
  reason?: string;
};

export type FreshPaymentRoute = {
  rail: "fresh_internal" | "bank" | "mobile_money" | "card" | "crypto" | "stablecoin";
  assetCode: string;
  estimatedFeeMinor?: bigint;
  estimatedSettlementSeconds?: number;
  available: boolean;
};
