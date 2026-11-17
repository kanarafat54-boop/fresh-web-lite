/**
 * Fresh Live session status state machine (control plane).
 * Pure functions — no I/O. Server API and tests share these rules.
 */

export type LiveSessionStatus =
  | "draft"
  | "scheduled"
  | "ready"
  | "live"
  | "interrupted"
  | "ending"
  | "ended"
  | "cancelled"
  | "failed"
  | "processing"
  | "replay_ready";

/** Allowed transitions. Entering `live` additionally requires a configured media adapter. */
export const ALLOWED_TRANSITIONS: Readonly<Record<LiveSessionStatus, readonly LiveSessionStatus[]>> = {
  draft: ["scheduled", "ready", "cancelled"],
  scheduled: ["ready", "cancelled"],
  ready: ["live", "cancelled", "failed"],
  live: ["ending", "interrupted", "failed"],
  interrupted: ["live", "ending", "failed"],
  ending: ["ended", "failed"],
  ended: ["processing"],
  processing: ["replay_ready", "failed"],
  cancelled: [],
  failed: [],
  replay_ready: [],
};

export type TransitionContext = {
  /** Must be true to enter status `live`. */
  mediaConfigured: boolean;
  /** Actor is the session creator (host). */
  isCreator: boolean;
};

export type TransitionResult =
  | { ok: true; from: LiveSessionStatus; to: LiveSessionStatus }
  | { ok: false; from: LiveSessionStatus; to: LiveSessionStatus; reason: string; code: string };

export function canTransition(
  from: LiveSessionStatus,
  to: LiveSessionStatus,
  ctx: TransitionContext,
): TransitionResult {
  if (!ctx.isCreator) {
    return {
      ok: false,
      from,
      to,
      reason: "Only the session creator may change status",
      code: "LIVE_FORBIDDEN",
    };
  }

  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return {
      ok: false,
      from,
      to,
      reason: `Cannot transition from '${from}' to '${to}'`,
      code: "LIVE_INVALID_TRANSITION",
    };
  }

  if (to === "live" && !ctx.mediaConfigured) {
    return {
      ok: false,
      from,
      to,
      reason:
        "Media plane is not configured. A real provider must confirm ingest/playback before status can become live.",
      code: "LIVE_MEDIA_NOT_CONFIGURED",
    };
  }

  return { ok: true, from, to };
}

export function isTerminal(status: LiveSessionStatus): boolean {
  return ALLOWED_TRANSITIONS[status]?.length === 0;
}

export function isPubliclyDiscoverable(status: LiveSessionStatus, visibility: string): boolean {
  if (visibility !== "public" && visibility !== "unlisted") return false;
  return status === "ready" || status === "live" || status === "interrupted";
}
