import type { TransferAuthorization } from "./types";

export type TreasuryActorRole = "user" | "platform-operator" | "owner";

export type TreasuryAuthorizationRequest = {
  actorId: string;
  role: TreasuryActorRole;
  transferId: string;
  challengeId: string;
  method: "password" | "passkey" | "biometric" | "recovery";
};

/**
 * Client-side representation of a trusted authorization result.
 *
 * This function intentionally does not verify passwords or biometrics. Those
 * checks belong to the authenticated server/security boundary. The browser
 * must never be treated as the authority for an owner transfer.
 */
export function createAuthorizationRecord(
  request: TreasuryAuthorizationRequest,
  authorizedAt = new Date().toISOString(),
): TransferAuthorization {
  if (!request.actorId || !request.challengeId || !request.transferId) {
    throw new Error("A treasury authorization requires actor, challenge and transfer identity");
  }

  return {
    actorId: request.actorId,
    challengeId: request.challengeId,
    method: request.method,
    authorizedAt,
  };
}

export function isPrivilegedRole(role: TreasuryActorRole): boolean {
  return role === "platform-operator" || role === "owner";
}
