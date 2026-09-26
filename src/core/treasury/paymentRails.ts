/**
 * Fresh Treasury payment & withdrawal rails.
 *
 * Principles (see TREASURY_ARCHITECTURE.md):
 * - External settlement providers are adapters, not the ledger source of truth.
 * - No balance is real until a trusted ledger entry records it.
 * - Client never mints value; deposits credit only after rail confirmation via server RPC.
 * - Withdrawals debit the user account first (or hold), then settle out through a rail.
 */

export type PaymentRailFamily =
  | "mobile_money"
  | "bank_transfer"
  | "card"
  | "digital_wallet"
  | "crypto_onchain"
  | "instant_rail"
  | "agent_cash"
  | "ussd_banking";

export type PaymentDirection = "deposit" | "withdrawal" | "both";

/** Connection state for a concrete rail adapter. */
export type RailConnectionStatus =
  | "connected"
  | "pending_integration"
  | "region_restricted"
  | "unavailable";

export type PaymentMethodDef = {
  id: string;
  family: PaymentRailFamily;
  label: string;
  shortLabel: string;
  description: string;
  direction: PaymentDirection;
  /** ISO 4217 or network asset codes this method typically moves. */
  currencies: string[];
  /** Primary regions / corridors (ISO country or region tags). */
  regions: string[];
  status: RailConnectionStatus;
  /** Fields the user must supply to use this method. */
  requiredFields: Array<
    | "phone"
    | "account_number"
    | "bank_code"
    | "iban"
    | "swift"
    | "card_token"
    | "wallet_email"
    | "crypto_address"
    | "network"
    | "agent_code"
    | "national_id"
  >;
  icon: string;
};

export type PaymentRailFamilyMeta = {
  id: PaymentRailFamily;
  label: string;
  description: string;
  icon: string;
};

export const PAYMENT_RAIL_FAMILIES: PaymentRailFamilyMeta[] = [
  {
    id: "mobile_money",
    label: "Mobile money",
    description: "Carrier wallets such as M-Pesa, Airtel Money, MTN MoMo, Wave.",
    icon: "📱",
  },
  {
    id: "bank_transfer",
    label: "Bank transfer",
    description: "Local EFT/ACH, SEPA, Faster Payments, and international wire (SWIFT).",
    icon: "🏦",
  },
  {
    id: "card",
    label: "Cards",
    description: "Visa and Mastercard debit or credit via a card processor.",
    icon: "💳",
  },
  {
    id: "digital_wallet",
    label: "Digital wallets",
    description: "PayPal, Apple Pay, Google Pay and similar hosted wallets.",
    icon: "👛",
  },
  {
    id: "crypto_onchain",
    label: "Crypto on-chain",
    description: "BTC, ETH, USDT, USDC and other assets settled on a public chain.",
    icon: "⛓",
  },
  {
    id: "instant_rail",
    label: "Instant rails",
    description: "UPI, Pix, FPS and other real-time account-to-account schemes.",
    icon: "⚡",
  },
  {
    id: "agent_cash",
    label: "Agent / cash",
    description: "Cash-in and cash-out through licensed agents or pickup points.",
    icon: "🏪",
  },
  {
    id: "ussd_banking",
    label: "USSD banking",
    description: "Feature-phone bank USSD sessions without a smartphone app.",
    icon: "#️⃣",
  },
];

/**
 * Canonical catalog of payment and withdrawal methods.
 * status reflects whether a live settlement adapter is wired in this environment.
 */
export const PAYMENT_METHODS: PaymentMethodDef[] = [
  // —— Mobile money ——
  {
    id: "mpesa",
    family: "mobile_money",
    label: "M-Pesa",
    shortLabel: "M-Pesa",
    description: "Safaricom M-Pesa STK push and B2C payouts (East Africa).",
    direction: "both",
    currencies: ["KES", "TZS"],
    regions: ["KE", "TZ", "EA"],
    status: "pending_integration",
    requiredFields: ["phone"],
    icon: "📱",
  },
  {
    id: "airtel_money",
    family: "mobile_money",
    label: "Airtel Money",
    shortLabel: "Airtel",
    description: "Airtel Money deposits and withdrawals across supported markets.",
    direction: "both",
    currencies: ["KES", "UGX", "TZS", "ZMW", "NGN"],
    regions: ["KE", "UG", "TZ", "ZM", "NG", "AF"],
    status: "pending_integration",
    requiredFields: ["phone"],
    icon: "📱",
  },
  {
    id: "mtn_momo",
    family: "mobile_money",
    label: "MTN MoMo",
    shortLabel: "MTN MoMo",
    description: "MTN Mobile Money collection and disbursement.",
    direction: "both",
    currencies: ["UGX", "GHS", "RWF", "ZMW", "XOF"],
    regions: ["UG", "GH", "RW", "ZM", "CI", "AF"],
    status: "pending_integration",
    requiredFields: ["phone"],
    icon: "📱",
  },
  {
    id: "tigo_pesa",
    family: "mobile_money",
    label: "Tigo Pesa / Mixx",
    shortLabel: "Tigo",
    description: "Tigo / Mixx by Yas mobile money (Tanzania and partners).",
    direction: "both",
    currencies: ["TZS"],
    regions: ["TZ"],
    status: "pending_integration",
    requiredFields: ["phone"],
    icon: "📱",
  },
  {
    id: "orange_money",
    family: "mobile_money",
    label: "Orange Money",
    shortLabel: "Orange",
    description: "Orange Money wallets in West and Central Africa.",
    direction: "both",
    currencies: ["XOF", "XAF", "MAD"],
    regions: ["SN", "CI", "CM", "MA", "AF"],
    status: "pending_integration",
    requiredFields: ["phone"],
    icon: "📱",
  },
  {
    id: "wave",
    family: "mobile_money",
    label: "Wave",
    shortLabel: "Wave",
    description: "Wave mobile money (Senegal, Côte d'Ivoire and expansion markets).",
    direction: "both",
    currencies: ["XOF"],
    regions: ["SN", "CI", "AF"],
    status: "pending_integration",
    requiredFields: ["phone"],
    icon: "📱",
  },

  // —— Bank transfer ——
  {
    id: "local_eft",
    family: "bank_transfer",
    label: "Local bank transfer (EFT / ACH)",
    shortLabel: "Local bank",
    description: "Domestic account-to-account transfer using local clearing.",
    direction: "both",
    currencies: ["KES", "UGX", "TZS", "NGN", "ZAR", "USD", "EUR", "GBP"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["account_number", "bank_code"],
    icon: "🏦",
  },
  {
    id: "sepa",
    family: "bank_transfer",
    label: "SEPA",
    shortLabel: "SEPA",
    description: "Euro area SEPA Credit Transfer and Instant.",
    direction: "both",
    currencies: ["EUR"],
    regions: ["EU", "EEA"],
    status: "pending_integration",
    requiredFields: ["iban"],
    icon: "🏦",
  },
  {
    id: "swift_wire",
    family: "bank_transfer",
    label: "International wire (SWIFT)",
    shortLabel: "SWIFT",
    description: "Cross-border bank wire via SWIFT messaging.",
    direction: "both",
    currencies: ["USD", "EUR", "GBP", "KES"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["iban", "swift", "account_number"],
    icon: "🌍",
  },

  // —— Cards ——
  {
    id: "card_visa_mc",
    family: "card",
    label: "Visa / Mastercard",
    shortLabel: "Card",
    description: "Deposit via card checkout; card payouts where the processor allows.",
    direction: "both",
    currencies: ["USD", "EUR", "GBP", "KES", "NGN", "ZAR"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["card_token"],
    icon: "💳",
  },

  // —— Digital wallets ——
  {
    id: "paypal",
    family: "digital_wallet",
    label: "PayPal",
    shortLabel: "PayPal",
    description: "PayPal balance and linked funding sources.",
    direction: "both",
    currencies: ["USD", "EUR", "GBP"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["wallet_email"],
    icon: "🅿️",
  },
  {
    id: "apple_pay",
    family: "digital_wallet",
    label: "Apple Pay",
    shortLabel: "Apple Pay",
    description: "Apple Pay for deposits on supported devices and regions.",
    direction: "deposit",
    currencies: ["USD", "EUR", "GBP"],
    regions: ["US", "EU", "GB"],
    status: "pending_integration",
    requiredFields: ["card_token"],
    icon: "",
  },
  {
    id: "google_pay",
    family: "digital_wallet",
    label: "Google Pay",
    shortLabel: "Google Pay",
    description: "Google Pay for deposits on supported devices and regions.",
    direction: "deposit",
    currencies: ["USD", "EUR", "GBP"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["card_token"],
    icon: "G",
  },

  // —— Crypto ——
  {
    id: "crypto_usdt",
    family: "crypto_onchain",
    label: "USDT (Tether)",
    shortLabel: "USDT",
    description: "USDT on TRC-20 / ERC-20; credit after confirmed on-chain deposit.",
    direction: "both",
    currencies: ["USDT"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["crypto_address", "network"],
    icon: "₮",
  },
  {
    id: "crypto_usdc",
    family: "crypto_onchain",
    label: "USDC",
    shortLabel: "USDC",
    description: "USDC on supported networks; credit after confirmed deposit.",
    direction: "both",
    currencies: ["USDC"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["crypto_address", "network"],
    icon: "◎",
  },
  {
    id: "crypto_btc",
    family: "crypto_onchain",
    label: "Bitcoin",
    shortLabel: "BTC",
    description: "On-chain BTC deposits and withdrawals after network confirmation.",
    direction: "both",
    currencies: ["BTC"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["crypto_address", "network"],
    icon: "₿",
  },
  {
    id: "crypto_eth",
    family: "crypto_onchain",
    label: "Ethereum",
    shortLabel: "ETH",
    description: "On-chain ETH deposits and withdrawals after network confirmation.",
    direction: "both",
    currencies: ["ETH"],
    regions: ["GLOBAL"],
    status: "pending_integration",
    requiredFields: ["crypto_address", "network"],
    icon: "Ξ",
  },

  // —— Instant rails ——
  {
    id: "upi",
    family: "instant_rail",
    label: "UPI",
    shortLabel: "UPI",
    description: "Unified Payments Interface (India) real-time transfers.",
    direction: "both",
    currencies: ["INR"],
    regions: ["IN"],
    status: "pending_integration",
    requiredFields: ["account_number"],
    icon: "⚡",
  },
  {
    id: "pix",
    family: "instant_rail",
    label: "Pix",
    shortLabel: "Pix",
    description: "Brazil Pix instant payment system.",
    direction: "both",
    currencies: ["BRL"],
    regions: ["BR"],
    status: "pending_integration",
    requiredFields: ["account_number"],
    icon: "⚡",
  },
  {
    id: "fps_uk",
    family: "instant_rail",
    label: "Faster Payments (UK)",
    shortLabel: "FPS",
    description: "UK Faster Payments Service account-to-account.",
    direction: "both",
    currencies: ["GBP"],
    regions: ["GB"],
    status: "pending_integration",
    requiredFields: ["account_number", "bank_code"],
    icon: "⚡",
  },

  // —— Agent / cash ——
  {
    id: "agent_cashout",
    family: "agent_cash",
    label: "Agent cash pickup",
    shortLabel: "Cash agent",
    description: "Collect or deposit cash at a licensed agent location.",
    direction: "both",
    currencies: ["KES", "UGX", "TZS", "NGN", "GHS"],
    regions: ["AF"],
    status: "pending_integration",
    requiredFields: ["agent_code", "national_id", "phone"],
    icon: "🏪",
  },

  // —— USSD ——
  {
    id: "ussd_bank",
    family: "ussd_banking",
    label: "Bank USSD",
    shortLabel: "USSD",
    description: "Bank USSD session for deposit or withdrawal without a smartphone app.",
    direction: "both",
    currencies: ["KES", "UGX", "NGN", "GHS"],
    regions: ["AF"],
    status: "pending_integration",
    requiredFields: ["phone", "bank_code"],
    icon: "#️⃣",
  },
];

export function methodsForDirection(direction: "deposit" | "withdrawal"): PaymentMethodDef[] {
  return PAYMENT_METHODS.filter(
    (m) => m.direction === direction || m.direction === "both",
  );
}

export function methodsByFamily(family: PaymentRailFamily): PaymentMethodDef[] {
  return PAYMENT_METHODS.filter((m) => m.family === family);
}

export function getPaymentMethod(id: string): PaymentMethodDef | undefined {
  return PAYMENT_METHODS.find((m) => m.id === id);
}

export function statusLabel(status: RailConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "pending_integration":
      return "Rail pending";
    case "region_restricted":
      return "Region limited";
    case "unavailable":
      return "Unavailable";
  }
}
