/**
 * Client conversation helpers with optional at-rest encryption via FreshSecureVault.
 *
 * Messages sent to /api/ai/ask remain plaintext for server processing.
 * Encryption applies when persisting content or preparing vault-sealed payloads.
 */
import { freshSecureVault } from "../../../core/crypto/FreshSecureVault.js";
import type { FreshE2EEPurpose } from "../../../core/crypto/FreshE2EE.js";

export interface ConversationMessage {
  id: number;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
  encrypted?: boolean;
}

class ConversationService {
  private messages: ConversationMessage[] = [];

  getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  vaultStatus() {
    return freshSecureVault.status();
  }

  async unlockVault(passphrase: string, saltB64?: string) {
    return freshSecureVault.unlockWithPassphrase(passphrase, saltB64);
  }

  async unlockEphemeral() {
    return freshSecureVault.unlockEphemeral();
  }

  lockVault() {
    freshSecureVault.lock();
  }

  async sealForStorage(
    text: string,
    purpose: FreshE2EEPurpose = "fresh-ai-conversation",
  ): Promise<{ payload: string; encrypted: boolean }> {
    if (!freshSecureVault.status().unlocked) {
      return { payload: text, encrypted: false };
    }
    const payload = await freshSecureVault.seal(text, purpose);
    return { payload, encrypted: true };
  }

  async openFromStorage(
    payload: string,
    purpose: FreshE2EEPurpose = "fresh-ai-conversation",
  ): Promise<{ text: string; encrypted: boolean }> {
    return freshSecureVault.open(payload, purpose);
  }

  /** Open a list of stored turn contents (legacy plaintext or envelopes). */
  async openTurns(
    turns: Array<{ role: "user" | "assistant"; content: string; createdAt: string }>,
  ): Promise<Array<{ role: "user" | "assistant"; content: string; createdAt: string; encrypted: boolean }>> {
    const opened = [];
    for (const turn of turns) {
      try {
        const result = await freshSecureVault.open(turn.content, "fresh-ai-conversation");
        opened.push({
          role: turn.role,
          content: result.text,
          createdAt: turn.createdAt,
          encrypted: result.encrypted,
        });
      } catch {
        opened.push({
          role: turn.role,
          content: freshSecureVault.isEncrypted(turn.content)
            ? "[Encrypted — unlock vault to read]"
            : turn.content,
          createdAt: turn.createdAt,
          encrypted: freshSecureVault.isEncrypted(turn.content),
        });
      }
    }
    return opened;
  }

  send(text: string): ConversationMessage[] {
    const userMessage: ConversationMessage = {
      id: Date.now(),
      role: "user",
      text,
      timestamp: Date.now(),
      encrypted: false,
    };
    this.messages.push(userMessage);

    const vault = freshSecureVault.status();
    const assistantMessage: ConversationMessage = {
      id: Date.now() + 1,
      role: "assistant",
      text: vault.unlocked
        ? "Mission received. Fresh AI is analyzing your request. Vault is unlocked — new history can be sealed at rest."
        : "Mission received. Fresh AI is analyzing your request. Unlock the vault to encrypt stored history at rest.",
      timestamp: Date.now(),
      encrypted: false,
    };
    this.messages.push(assistantMessage);
    return this.getMessages();
  }

  clear() {
    this.messages = [];
  }
}

export const conversationService = new ConversationService();
