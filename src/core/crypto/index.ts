export {
  FRESH_E2EE_VERSION,
  FRESH_E2EE_ALG,
  FRESH_E2EE_KDF,
  FRESH_E2EE_MARKER,
  FRESH_PBKDF2_ITERATIONS,
  type FreshE2EEPurpose,
  type FreshSecureEnvelope,
  type FreshMasterKeyMaterial,
  assertFreshE2EEContract,
  isFreshSecureEnvelope,
  looksLikeEncryptedPayload,
  serializeEnvelope,
  parseEnvelope,
  deriveMasterKeyFromPassphrase,
  generateMasterKey,
  encryptText,
  decryptText,
  decryptOrLegacy,
} from "./FreshE2EE.js";

export { freshSecureVault, type VaultStatus } from "./FreshSecureVault.js";
