/**
 * Client-side secure vault session for Fresh AI at-rest encryption.
 * Master key lives only in memory while unlocked; never written plaintext to disk.
 * Passphrase KDF params (salt + kid) persist in localStorage so re-unlock can open prior seals.
 */
import {
  type FreshE2EEPurpose,
  type FreshMasterKeyMaterial,
  assertFreshE2EEContract,
  base64ToBytes,
  bytesToBase64,
  decryptOrLegacy,
  decryptText,
  deriveMasterKeyFromPassphrase,
  generateMasterKey,
  encryptText,
  looksLikeEncryptedPayload,
} from "./FreshE2EE.js";

const SESSION_FLAG = "fresh_vault_unlocked";
const KDF_STORAGE_KEY = "fresh_vault_kdf_v1";

export type VaultStatus = {
  unlocked: boolean;
  kid: string | null;
  mode: "locked" | "passphrase" | "ephemeral";
  hasStoredKdf: boolean;
};

type StoredKdf = { saltB64: string; kid: string; iterations: number };

function readStoredKdf(): StoredKdf | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KDF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredKdf>;
    if (
      typeof parsed.saltB64 === "string" &&
      typeof parsed.kid === "string" &&
      typeof parsed.iterations === "number"
    ) {
      return { saltB64: parsed.saltB64, kid: parsed.kid, iterations: parsed.iterations };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function writeStoredKdf(params: StoredKdf): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KDF_STORAGE_KEY, JSON.stringify(params));
}

function clearStoredKdf(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KDF_STORAGE_KEY);
}

class FreshSecureVaultImpl {
  private material: FreshMasterKeyMaterial | null = null;
  private mode: VaultStatus["mode"] = "locked";
  private saltB64: string | null = null;
  private iterations: number | null = null;

  constructor() {
    assertFreshE2EEContract();
  }

  status(): VaultStatus {
    return {
      unlocked: this.material !== null,
      kid: this.material?.kid ?? null,
      mode: this.mode,
      hasStoredKdf: readStoredKdf() !== null,
    };
  }

  /**
   * Unlock with passphrase. Reuses stored salt/kid when present so previously
   * sealed envelopes remain openable. Pass existingSaltB64 to force a specific salt.
   */
  async unlockWithPassphrase(passphrase: string, existingSaltB64?: string): Promise<VaultStatus> {
    const stored = readStoredKdf();
    const saltBytes = existingSaltB64
      ? base64ToBytes(existingSaltB64)
      : stored
        ? base64ToBytes(stored.saltB64)
        : undefined;
    const kid = stored && !existingSaltB64 ? stored.kid : undefined;
    const iterations = stored && !existingSaltB64 ? stored.iterations : undefined;

    const {
      material,
      salt: usedSalt,
      iterations: usedIterations,
    } = await deriveMasterKeyFromPassphrase(passphrase, {
      salt: saltBytes,
      kid,
      iterations,
    });

    this.material = material;
    this.mode = "passphrase";
    this.saltB64 = bytesToBase64(usedSalt);
    this.iterations = usedIterations;

    writeStoredKdf({
      saltB64: this.saltB64,
      kid: material.kid,
      iterations: usedIterations,
    });

    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SESSION_FLAG, "1");
    return this.status();
  }

  async unlockEphemeral(): Promise<VaultStatus> {
    this.material = await generateMasterKey();
    this.mode = "ephemeral";
    this.saltB64 = null;
    this.iterations = null;
    // Ephemeral keys intentionally do not overwrite passphrase KDF storage.
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SESSION_FLAG, "1");
    return this.status();
  }

  lock(): void {
    this.material = null;
    this.mode = "locked";
    this.saltB64 = null;
    this.iterations = null;
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SESSION_FLAG);
  }

  /** Destructive: forgets KDF params so old sealed rows cannot be opened with this device identity. */
  resetStoredKdf(): void {
    clearStoredKdf();
    this.lock();
  }

  getPassphraseParams(): { saltB64: string; iterations: number; kid: string } | null {
    if (this.saltB64 && this.iterations && this.material) {
      return { saltB64: this.saltB64, iterations: this.iterations, kid: this.material.kid };
    }
    const stored = readStoredKdf();
    if (stored) return stored;
    return null;
  }

  async seal(plaintext: string, purpose: FreshE2EEPurpose): Promise<string> {
    if (!this.material) throw new Error("Vault is locked");
    return encryptText(plaintext, this.material, purpose, {
      saltB64: this.saltB64 ?? undefined,
      iterations: this.iterations ?? undefined,
    });
  }

  async open(
    payload: string,
    purpose: FreshE2EEPurpose,
  ): Promise<{ text: string; encrypted: boolean }> {
    return decryptOrLegacy(payload, this.material, purpose);
  }

  async openStrict(payload: string, purpose: FreshE2EEPurpose): Promise<string> {
    if (!this.material) throw new Error("Vault is locked");
    return decryptText(payload, this.material, purpose);
  }

  isEncrypted(content: string): boolean {
    return looksLikeEncryptedPayload(content);
  }
}

export type FreshSecureVault = FreshSecureVaultImpl;

/** Singleton vault for the browser session. */
export const freshSecureVault: FreshSecureVault = new FreshSecureVaultImpl();
