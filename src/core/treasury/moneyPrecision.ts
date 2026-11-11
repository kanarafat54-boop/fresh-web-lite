/**
 * Minor-unit precision for Treasury amounts.
 *
 * Fiat precision follows ISO 4217 minor-unit conventions for the currencies
 * used by Fresh payment rails. FRESH is a separate internal asset with a
 * two-decimal display convention; this does not establish a market price.
 */
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG",
  "RWF", "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF",
]);
const THREE_DECIMAL = new Set([
  "BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND",
]);

export function minorUnitDigits(assetCode: string): number {
  const code = assetCode.trim().toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

const MAX_SIGNED_BIGINT = 9_223_372_036_854_775_807n;

export function parseAmountToMinor(input: string, assetCode: string): string | null {
  const digits = minorUnitDigits(assetCode);
  const trimmed = input.trim();
  const pattern = digits === 0
    ? /^\d+$/
    : new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`);
  if (!pattern.test(trimmed)) return null;

  const [whole, fraction = ""] = trimmed.split(".");
  const scaledFraction = digits === 0 ? "" : fraction.padEnd(digits, "0");
  const combined = `${whole}${scaledFraction}`.replace(/^0+(?=\d)/, "");
  try {
    const amount = BigInt(combined || "0");
    if (amount <= 0n || amount > MAX_SIGNED_BIGINT) return null;
    return amount.toString();
  } catch {
    return null;
  }
}

export function formatMinorUnits(value: string, assetCode: string): string {
  const code = assetCode.trim().toUpperCase();
  const digits = minorUnitDigits(code);
  try {
    const amount = BigInt(value);
    const sign = amount < 0n ? "-" : "";
    const absolute = amount < 0n ? -amount : amount;
    const scale = 10n ** BigInt(digits);
    const whole = absolute / scale;
    const groupedWhole = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (digits === 0) return `${sign}${code} ${groupedWhole}`;
    const fraction = (absolute % scale).toString().padStart(digits, "0");
    return `${sign}${code} ${groupedWhole}.${fraction}`;
  } catch {
    return `${code} —`;
  }
}
