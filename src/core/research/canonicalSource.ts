import { createHash } from "node:crypto";

/**
 * Returns a conservative identity URL for deduplication.
 *
 * The observed URL remains untouched in Evidence Passports. Only known tracking
 * parameters and fragments are removed; meaningful query parameters are kept.
 * Invalid, credential-bearing, and non-HTTP(S) URLs return null rather than
 * being treated as safe canonical identities.
 */
export function canonicalizeSourceUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input.trim());
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;

    url.hash = "";

    const trackingKeys = new Set([
      "gclid", "dclid", "fbclid", "msclkid", "mc_cid", "mc_eid",
      "_hsenc", "_hsmi", "igshid", "vero_id", "oly_anon_id", "oly_enc_id",
    ]);
    for (const key of [...url.searchParams.keys()]) {
      const normalized = key.toLowerCase();
      if (normalized.startsWith("utm_") || trackingKeys.has(normalized)) {
        url.searchParams.delete(key);
      }
    }
    // URL normalizes host casing and default ports. Preserve path and query ordering because either can be meaningful.
    return url.toString();
  } catch {
    return null;
  }
}

/** Stable internal identity for a canonical source URL; never a truth signal. */
export function canonicalSourceId(input: string): string | null {
  const canonical = canonicalizeSourceUrl(input);
  if (!canonical) return null;
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `fresh-source-${digest.slice(0, 32)}`;
}

/**
 * Keeps the first observed source for each canonical URL. Invalid URLs are
 * deduplicated only by their exact trimmed input and remain invalid elsewhere.
 */
export function uniqueByCanonicalUrl<T extends { url: string }>(sources: T[]): T[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (typeof source.url !== "string") return false;
    const canonical = canonicalizeSourceUrl(source.url);
    const key = canonical ?? `invalid:${source.url.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
