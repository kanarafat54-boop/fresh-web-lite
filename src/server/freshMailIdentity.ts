/**
 * Fresh Mail address as a sign-in name and a recovery handle.
 *
 * A person can type their Fresh Mail address (for example name@your-fresh-domain) instead of the email
 * their account was created with. The server looks up the active address, finds the account that owns it and
 * signs in or starts recovery for that account. Responses never reveal whether an address exists or what
 * email is behind it. The password-reset link goes to the account's verified email, not to the Fresh Mail
 * inbox: someone locked out of the account could not open an inbox that is inside it.
 */
export const MAX_ADDRESS_LENGTH = 254;
const SHAPE = /^[a-z0-9][a-z0-9._+-]{0,63}@[a-z0-9][a-z0-9.-]{0,252}\.[a-z]{2,}$/;

/** Lowercased, trimmed address, or null when it is not a plausible address. */
export function normalizeFreshAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const address = value.trim().toLowerCase();
  if (address.length > MAX_ADDRESS_LENGTH || !SHAPE.test(address) || address.includes("..")) return null;
  return address;
}

export type IdentityRequest =
  | { action: "login"; address: string; password: string }
  | { action: "recover"; address: string };

export function parseIdentityRequest(body: unknown): IdentityRequest | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const address = normalizeFreshAddress(raw.address);
  if (!address) return null;
  if (raw.action === "recover") return { action: "recover", address };
  if (raw.action === "login" && typeof raw.password === "string" && raw.password.length > 0 && raw.password.length <= 256) {
    return { action: "login", address, password: raw.password };
  }
  return null;
}

export const GENERIC_LOGIN_ERROR = "Incorrect email or password.";
export const GENERIC_RECOVERY_NOTICE = "If that address belongs to an account, a password reset link has been sent to the email the account was created with.";
