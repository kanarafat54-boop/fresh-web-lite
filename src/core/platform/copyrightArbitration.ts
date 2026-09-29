/**
 * Escrow Copyright Arbitration Engine — Content ID style holds.
 * Fits Studio brand deals, Trust workspace, and Ads revenue holds.
 * Does not invent ledger balances; holds are local contracts until
 * treasury settlement adapters connect.
 */

export type ClaimStatus = "open" | "held" | "fair-use-likely" | "resolved-claimant" | "resolved-creator" | "dismissed";

export type CopyrightClaim = {
  id: string;
  contentId: string;
  claimantId: string;
  creatorId: string;
  reason: string;
  status: ClaimStatus;
  /** Ad/sponsor proceeds held while disputed (minor units) */
  heldAmountMinor: number;
  currency: string;
  similarityScore?: number;
  createdAt: string;
  updatedAt: string;
};

export function openCopyrightClaim(input: {
  contentId: string;
  claimantId: string;
  creatorId: string;
  reason: string;
  heldAmountMinor?: number;
  currency?: string;
}): CopyrightClaim {
  if (!input.contentId || !input.claimantId || !input.creatorId) {
    throw new Error("Copyright claim requires content, claimant, and creator.");
  }
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    contentId: input.contentId,
    claimantId: input.claimantId,
    creatorId: input.creatorId,
    reason: input.reason.trim() || "Manual claim",
    status: "open",
    heldAmountMinor: Math.max(0, Math.floor(input.heldAmountMinor ?? 0)),
    currency: (input.currency ?? "UGX").toUpperCase(),
    createdAt: now,
    updatedAt: now,
  };
}

/** Automated dispute hold — routes proceeds into neutral hold state. */
export function holdClaimProceeds(claim: CopyrightClaim): CopyrightClaim {
  if (claim.status === "resolved-claimant" || claim.status === "resolved-creator" || claim.status === "dismissed") {
    return claim;
  }
  return { ...claim, status: "held", updatedAt: new Date().toISOString() };
}

/**
 * Fair-use / similarity classifier stub.
 * Real fingerprint models plug in via similarityScore from an external adapter.
 */
export function runFairUseClassifier(
  claim: CopyrightClaim,
  similarityScore: number,
): CopyrightClaim {
  const score = Math.max(0, Math.min(1, similarityScore));
  let status: ClaimStatus = "held";
  if (score < 0.35) status = "fair-use-likely";
  else if (score >= 0.85) status = "held";
  return {
    ...claim,
    similarityScore: score,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function resolveClaim(
  claim: CopyrightClaim,
  outcome: "claimant" | "creator" | "dismiss",
): CopyrightClaim {
  const status: ClaimStatus =
    outcome === "claimant" ? "resolved-claimant" : outcome === "creator" ? "resolved-creator" : "dismissed";
  return { ...claim, status, updatedAt: new Date().toISOString() };
}
