export type SessionShieldStatus =
  | "NORMAL"
  | "ANOMALOUS"
  | "CHALLENGE"
  | "QUARANTINED"
  | "REVOKED";

export type SessionActionSensitivity = "normal" | "sensitive" | "critical";

export type SessionRiskSignals = {
  deviceContinuity: number;
  credentialContinuity: number;
  networkAnomaly: number;
  userAgentAnomaly: number;
  geographicAnomaly: number;
  requestAnomaly: number;
};

export type SessionIntegrity = {
  sessionId: string;
  userId: string;
  deviceId: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  riskScore: number;
  status: SessionShieldStatus;
  signals: SessionRiskSignals;
};

export type SessionEvaluation = {
  status: SessionShieldStatus;
  riskScore: number;
  requiresStepUp: boolean;
  allowSensitiveAction: boolean;
  allowCriticalAction: boolean;
  reasons: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Client-safe risk model. It never treats a browser/device fingerprint as identity
 * and never grants authentication by itself. The authoritative decision belongs
 * to the server/session backend.
 */
export function evaluateSessionIntegrity(
  signals: SessionRiskSignals,
  action: SessionActionSensitivity = "normal",
): SessionEvaluation {
  const normalized = {
    deviceContinuity: clamp(signals.deviceContinuity),
    credentialContinuity: clamp(signals.credentialContinuity),
    networkAnomaly: clamp(signals.networkAnomaly),
    userAgentAnomaly: clamp(signals.userAgentAnomaly),
    geographicAnomaly: clamp(signals.geographicAnomaly),
    requestAnomaly: clamp(signals.requestAnomaly),
  };

  const positiveContinuity =
    (normalized.deviceContinuity + normalized.credentialContinuity) / 2;
  const anomalies =
    (normalized.networkAnomaly +
      normalized.userAgentAnomaly +
      normalized.geographicAnomaly +
      normalized.requestAnomaly) /
    4;

  const riskScore = clamp(anomalies * 0.7 + (1 - positiveContinuity) * 0.3);
  const reasons: string[] = [];

  if (normalized.credentialContinuity < 0.5) {
    reasons.push("Credential continuity is weak; renewed cryptographic proof may be required.");
  }
  if (normalized.deviceContinuity < 0.5) {
    reasons.push("Device continuity changed materially.");
  }
  if (anomalies >= 0.5) {
    reasons.push("Multiple session anomaly signals are elevated.");
  }

  let status: SessionShieldStatus = "NORMAL";
  if (riskScore >= 0.85) status = "QUARANTINED";
  else if (riskScore >= 0.65) status = "CHALLENGE";
  else if (riskScore >= 0.4) status = "ANOMALOUS";

  const requiresStepUp = status === "CHALLENGE" || status === "QUARANTINED";
  const allowSensitiveAction = status === "NORMAL" || status === "ANOMALOUS";
  const allowCriticalAction = status === "NORMAL" && action === "critical";

  if (action === "sensitive" && requiresStepUp) {
    reasons.push("Sensitive action requires fresh authentication.");
  }
  if (action === "critical" && status !== "NORMAL") {
    reasons.push("Critical action is blocked until the session is re-established and verified.");
  }
  if (reasons.length === 0) reasons.push("Session integrity is within the normal operating range.");

  return {
    status,
    riskScore,
    requiresStepUp,
    allowSensitiveAction: action === "normal" ? true : allowSensitiveAction,
    allowCriticalAction: action === "critical" ? allowCriticalAction : status === "NORMAL",
    reasons,
  };
}

/** Critical operations must always be re-authorized server-side. */
export function canAttemptCriticalAction(
  evaluation: SessionEvaluation,
  hasFreshCryptographicProof: boolean,
): boolean {
  return evaluation.status === "NORMAL" && hasFreshCryptographicProof;
}

/** Security telemetry can be kept invisible from the normal product UI. */
export function shouldShowSecurityInterruption(evaluation: SessionEvaluation): boolean {
  return evaluation.status === "CHALLENGE" || evaluation.status === "QUARANTINED";
}
