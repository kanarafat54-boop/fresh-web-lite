import type { FreshAsset, FreshPaymentRoute } from "./freshCryptoTypes";

export type FreshRouteContext = {
  asset: FreshAsset;
  availableRails: FreshPaymentRoute[];
  requestedAmountMinor: bigint;
  destinationType: "fresh_user" | "bank" | "mobile_money" | "card" | "external_crypto";
};

export function selectPaymentRoutes(context: FreshRouteContext): FreshPaymentRoute[] {
  return context.availableRails
    .filter((route) => route.available)
    .filter((route) => context.destinationType !== "fresh_user" || route.rail === "fresh_internal")
    .filter((route) => route.assetCode === context.asset.code)
    .sort((a, b) => Number(a.estimatedFeeMinor ?? 0n) - Number(b.estimatedFeeMinor ?? 0n));
}
