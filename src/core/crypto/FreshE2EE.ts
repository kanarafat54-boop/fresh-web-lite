/**
 * Fresh AI at-rest encryption primitives (Web Crypto).
 *
 * This is intentional client-side crypto for stored memory and conversation
 * content. It does NOT make server-side inference E2EE: the live /api/ai path
 * still receives plaintext for processing until an on-device model is used.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const FRESH_E2EE_VERSION = 1 as const;
export const FRESH_E2EE_ALG = "AES-GCM-256" as const;
export const FRESH_E2EE_KDF = "PBKDF2-SHA256" as const;
export const FRESH_E2EE_MARKER = "fresh-e2ee-v1:" as const;

/** PBKDF2 iterations — balance security and mobile unlock latency. */
export const FRESH_PBKDF2_ITERATIONS = 120_000;

export type FreshE2EEPurpose =
  | "fresh-ai-memory"
  | "fresh-ai-conversation"
  | "fresh-ai-artifact"
  | "fresh-ai-preference";

export type FreshSecureEnvelope = {
  v: typeof FRESH_E2EE_VERSION;
  alg: typeof FRESH_E2EE_ALG;
  kdf: typeof FRESH_E2EE_KDF;
  salt: string;
  iv: string;
  ct: string;
  aad: FreshE2EEPurpose;
  kid: string;
  iterations: number;
};

export type FreshMasterKeyMaterial = {
  kid: string;
  key: CryptoKey;
  /** Raw key bytes for optional wrap/export — never persist unwrapped. */
  raw?: ArrayBuffer;
};

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SubtleCrypto is not available in this environment");
  return subtle;
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export function isFreshSecureEnvelope(value: unknown): value is FreshSecureEnvelope {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    e.v === FRESH_E2EE_VERSION &&
    e.alg === FRESH_E2EE_ALG &&
    e.kdf === FRESH_E2EE_KDF &&
    typeof e.salt === "string" &&
    typeof e.iv === "string" &&
    typeof e.ct === "string" &&
    typeof e.aad === "string" &&
    typeof e.kid === "string" &&
    typeof e.iterations === "number"
  );
}

/** Detect serialized envelope string (legacy plaintext otherwise). */
export function looksLikeEncryptedPayload(content: string): boolean {
  if (!content.startsWith(FRESH_E2EE_MARKER)) return false;
  try {
    const parsed = JSON.parse(content.slice(FRESH_E2EE_MARKER.length)) as unknown;
    return isFreshSecureEnvelope(parsed);
  } catch {
    return false;
  }
}

export function serializeEnvelope(envelope: FreshSecureEnvelope): string {
  return `${FRESH_E2EE_MARKER}${JSON.stringify(envelope)}`;
}

export function parseEnvelope(content: string): FreshSecureEnvelope {
  if (!content.startsWith(FRESH_E2EE_MARKER)) {
    throw new Error("Payload is not a Fresh E2EE envelope");
  }
  const parsed = JSON.parse(content.slice(FRESH_E2EE_MARKER.length)) as unknown;
  if (!isFreshSecureEnvelope(parsed)) throw new Error("Invalid Fresh E2EE envelope");
  return parsed;
}

export async function deriveMasterKeyFromPassphrase(
  passphrase: string,
  options?: { salt?: Uint8Array; kid?: string; iterations?: number },
): Promise<{ material: FreshMasterKeyMaterial; salt: Uint8Array; iterations: number }> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error("Passphrase must be at least 8 characters");
  }
  const subtle = getSubtle();
  const salt = options?.salt ?? randomBytes(16);
  const iterations = options?.iterations ?? FRESH_PBKDF2_ITERATIONS;
  const kid = options?.kid ?? `fresh-mk-${bytesToBase64(randomBytes(8)).replace(/[+/=]/g, "").slice(0, 12)}`;

  const baseKey = await subtle.importKey("raw", textEncoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  return { material: { kid, key }, salt, iterations };
}

export async function generateMasterKey(): Promise<FreshMasterKeyMaterial> {
  const subtle = getSubtle();
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await subtle.exportKey("raw", key);
  const kid = `fresh-mk-${bytesToBase64(randomBytes(8)).replace(/[+/=]/g, "").slice(0, 12)}`;
  return { kid, key, raw };
}

export async function encryptText(
  plaintext: string,
  material: FreshMasterKeyMaterial,
  purpose: FreshE2EEPurpose,
  options?: { saltB64?: string; iterations?: number },
): Promise<string> {
  const subtle = getSubtle();
  const iv = randomBytes(12);
  const aad = textEncoder.encode(purpose);
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    material.key,
    textEncoder.encode(plaintext),
  );

  const envelope: FreshSecureEnvelope = {
    v: FRESH_E2EE_VERSION,
    alg: FRESH_E2EE_ALG,
    kdf: FRESH_E2EE_KDF,
    salt: options?.saltB64 ?? bytesToBase64(randomBytes(16)),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(ciphertext),
    aad: purpose,
    kid: material.kid,
    iterations: options?.iterations ?? FRESH_PBKDF2_ITERATIONS,
  };
  return serializeEnvelope(envelope);
}

export async function decryptText(
  payload: string,
  material: FreshMasterKeyMaterial,
  expectedPurpose: FreshE2EEPurpose,
): Promise<string> {
  const envelope = parseEnvelope(payload);
  if (envelope.aad !== expectedPurpose) {
    throw new Error(`AAD mismatch: expected ${expectedPurpose}, got ${envelope.aad}`);
  }
  if (envelope.kid !== material.kid) {
    throw new Error(`Key id mismatch: ciphertext kid=${envelope.kid}, material kid=${material.kid}`);
  }
  const subtle = getSubtle();
  const iv = base64ToBytes(envelope.iv);
  const ct = base64ToBytes(envelope.ct);
  const aad = textEncoder.encode(expectedPurpose);
  const plain = await subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    material.key,
    ct,
  );
  return textDecoder.decode(plain);
}

/**
 * Decrypt if envelope, otherwise return legacy plaintext unchanged.
 * Never invent content on failure — throw so callers can surface locked vault.
 */
export async function decryptOrLegacy(
  content: string,
  material: FreshMasterKeyMaterial | null,
  purpose: FreshE2EEPurpose,
): Promise<{ text: string; encrypted: boolean }> {
  if (!looksLikeEncryptedPayload(content)) {
    return { text: content, encrypted: false };
  }
  if (!material) throw new Error("Vault is locked: encrypted content requires unlock");
  const text = await decryptText(content, material, purpose);
  return { text, encrypted: true };
}

export function assertFreshE2EEContract(): void {
  if (FRESH_E2EE_VERSION !== 1) throw new Error("Unexpected E2EE version");
  if (FRESH_PBKDF2_ITERATIONS < 100_000) throw new Error("PBKDF2 iterations below minimum");
  if (!FRESH_E2EE_MARKER.startsWith("fresh-e2ee-")) throw new Error("Invalid envelope marker");
}
