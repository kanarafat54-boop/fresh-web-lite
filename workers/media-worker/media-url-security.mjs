import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPublicIPv4(value) {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  return true;
}

function isPublicIPv6(value) {
  const address = value.toLowerCase().split("%")[0];
  if (address.startsWith("::ffff:")) {
    const mapped = address.slice(7);
    return isIP(mapped) === 4 && isPublicIPv4(mapped);
  }
  const parts = address.split(":");
  const first = Number.parseInt(parts[0] || "0", 16);
  const second = Number.parseInt(parts[1] || "0", 16);
  if (first === 0x2001 && second === 0x0db8) return false; // Documentation-only range.
  return Number.isFinite(first) && first >= 0x2000 && first <= 0x3fff;
}

export function isPublicAddress(value) {
  const version = isIP(value);
  if (version === 4) return isPublicIPv4(value);
  if (version === 6) return isPublicIPv6(value);
  return false;
}

export async function assertSafeMediaUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("A valid HTTPS media URL is required.");
  }

  if (parsed.protocol !== "https:") throw new Error("Media URLs must use HTTPS.");
  if (parsed.username || parsed.password) throw new Error("Media URLs must not contain embedded credentials.");
  if (parsed.port && parsed.port !== "443") throw new Error("Media URLs may only use the standard HTTPS port.");
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal") ||
      hostname.endsWith(".test") || hostname.endsWith(".example") ||
      hostname.endsWith(".invalid") || hostname.endsWith(".onion")) {
    throw new Error("Local and reserved hosts are not allowed.");
  }

  if (isIP(hostname)) {
    if (!isPublicAddress(hostname)) throw new Error("Private or reserved media addresses are not allowed.");
    return { url: parsed, address: hostname };
  }

  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Media host could not be resolved.");
  }
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new Error("Media hosts must resolve only to public IP addresses.");
  }
  // Return a validated address and pin the HTTPS socket to it to prevent DNS rebinding
  // between validation and the actual connection. TLS still verifies the URL hostname.
  return { url: parsed, address: addresses[0].address };
}
