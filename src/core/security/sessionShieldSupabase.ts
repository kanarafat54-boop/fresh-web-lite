import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import {
  evaluateSessionIntegrity,
  type SessionActionSensitivity,
  type SessionEvaluation,
  type SessionRiskSignals,
} from "./sessionShield";

export type FreshSessionBoundary = {
  session: Session;
  user: User;
  evaluation: SessionEvaluation;
};

const safeSessionSignals = (): SessionRiskSignals => ({
  deviceContinuity: 1,
  credentialContinuity: 1,
  networkAnomaly: 0,
  userAgentAnomaly: 0,
  geographicAnomaly: 0,
  requestAnomaly: 0,
});

/**
 * Real Fresh authentication boundary.
 * Supabase remains authoritative for authentication/session validity;
 * Session Shield is an additional policy layer and never replaces it.
 *
 * Current client signals intentionally start conservative. Server-side
 * telemetry and cryptographic proof must supply anomaly signals before a
 * session can be treated as compromised.
 */
export async function getFreshSessionBoundary(
  action: SessionActionSensitivity = "normal",
): Promise<FreshSessionBoundary | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;

  const session = data.session;
  const evaluation = evaluateSessionIntegrity(safeSessionSignals(), action);

  return {
    session,
    user: session.user,
    evaluation,
  };
}

export async function requireFreshSession(
  action: SessionActionSensitivity = "normal",
): Promise<FreshSessionBoundary> {
  const boundary = await getFreshSessionBoundary(action);
  if (!boundary) throw new Error("FRESH_SESSION_REQUIRED");
  if ((action === "critical" || action === "sensitive") && boundary.evaluation.requiresStepUp) {
    throw new Error("FRESH_SESSION_STEP_UP_REQUIRED");
  }
  return boundary;
}

export async function revokeCurrentFreshSession(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}
