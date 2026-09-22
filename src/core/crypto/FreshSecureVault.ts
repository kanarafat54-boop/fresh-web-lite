/**
 * Client-side secure vault session for Fresh AI at-rest encryption.
 * Master key lives only in memory while unlocked; never written plaintext to disk.
 */
import {
  type FreshE2EEPurpose,
  type FreshMasterKeyMaterial,
  assertFreshE2EEContract,
  decryptOrLegacy,
  decryptText,
  deriveMasterKeyFromPassphrase,
  encryptText,
  generateMasterKey,
  looksLikeEncryptedPayload,
} from "./FreshE2EE.js";

const SESSION_FLAG = "fresh_vault_unlocked";

export type VaultStatus = {
  unlocked: boolean;
  kid: string | null;
  mode: "locked" | "passphrase" | "ephemeral";
};

class FreshSecureVault {
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
    };
  }

  /** Unlock with user passphrase (recommended for multi-device recovery). */
  async unlockWithPassphrase(passphrase: string, existingSaltB64?: string): Promise<VaultStatus> {
    const salt = existingSaltB64
      ? Uint8Array.from(atob(existingSaltB64), (c) => c.charCodeAt(0))
      : undefined;
    const { material, salt: usedSalt, iterations } = await deriveMasterKeyFromPassphrase(passphrase, {
      salt,
      kid: this.material?.kid,
    });
    this.material = material;
    this.mode = "passphrase";
    this.saltB64 = btoa(String.fromCharCode(...usedSalt));
    this.iterations = iterations;
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SESSION_FLAG, "1");
    return this.status();
  }

  /** Ephemeral device key for session-only protection (lost on lock / reload). */
  async unlockEphemeral(): Promise<VaultStatus> {
    this.material = await generateMasterKey();
    this.mode = "ephemeral";
    this.saltB64 = null;
    this.iterations = null;
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

  getPassphraseParams(): { saltB64: string; iterations: number } | null {
    if (!this.saltB64 || !this.iterations) return null;
    return { saltB64: this.saltB64, iterations: this.iterations };
  }

  async seal(plaintext: string, purpose: FreshE2EEPurpose): Promise<string> {
    if (!this.material) throw new Error("Vault is locked");
    return encryptText(plaintext, this.material, purpose, {
      saltB64: this.saltB64 ?? undefined,
      iterations: this.iterations ?? undefined,
    });
  }

  async open(payload: string, purpose: FreshE2EEPurpose): Promise<{ text: string; encrypted: boolean }> {
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

/** Singleton vault for the browser session. */
export const freshSecureVault = new FreshSecureVault();

export type { FreshSecureVault };
