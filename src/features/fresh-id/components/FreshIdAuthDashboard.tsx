/**
 * Fresh Web Lite — Independent Fresh ID Auth Dashboard
 * Unified identity surface for sign-in, registration, credentials, privacy,
 * policy, human-surface identity, and security onboarding.
 */

import { useEffect, useMemo, useState } from "react";
import { useFreshId } from "../context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";
import { AuthForm } from "./AuthForm";
import "./FreshIdAuthDashboard.css";

type Panel = "auth" | "credentials" | "security" | "surface" | "privacy" | "policy";

type PasskeyRecord = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

function readOrCreateSurfaceId(): string {
  try {
    const key = "fresh.humanSurfaceId";
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `hs_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
        : `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return `hs_ephemeral_${Date.now().toString(36)}`;
  }
}

function deviceClass(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "Apple mobile";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Browser surface";
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `••••@${domain}`;
  return `${local.slice(0, 2)}••••@${domain}`;
}

function formatDate(value?: string): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export default function FreshIdAuthDashboard() {
  const {
    user,
    isAuthenticated,
    isGuest,
    passkeySupported,
    loading,
    error,
    message,
    registerPasskey,
    listPasskeys,
    removePasskey,
    logout,
    setAuthView,
  } = useFreshId();
  const { setActiveRoute } = useLayout();
  const [panel, setPanel] = useState<Panel>("auth");
  const [surfaceId] = useState(readOrCreateSurfaceId);
  const [now, setNow] = useState(() => new Date());
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  useEffect(() => {
    setAuthView("form");
  }, [setAuthView]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      setPasskeys([]);
      return;
    }
    let cancelled = false;
    void listPasskeys().then((items) => {
      if (!cancelled) setPasskeys(items as PasskeyRecord[]);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isGuest, listPasskeys]);

  async function handleRegisterPasskey() {
    setPasskeyBusy(true);
    const created = await registerPasskey();
    if (created) {
      setPasskeys((current) => [...current, created as PasskeyRecord]);
      setPanel("credentials");
    }
    setPasskeyBusy(false);
  }

  async function handleRemovePasskey(id: string) {
    setPasskeyBusy(true);
    await removePasskey(id);
    setPasskeys((current) => current.filter((passkey) => passkey.id !== id));
    setPasskeyBusy(false);
  }

  async function handleLogout() {
    await logout();
    setPanel("auth");
  }

  const surfaceRows = useMemo(() => {
    const secure = typeof window !== "undefined" ? window.isSecureContext : false;
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    const lang = typeof navigator !== "undefined" ? navigator.language : "—";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "—";
    const theme =
      typeof document !== "undefined"
        ? document.documentElement.dataset.theme || "system"
        : "system";
    return [
      { label: "Human surface ID", value: surfaceId, note: "Local to this browser. Not a government ID." },
      { label: "Surface class", value: deviceClass(), note: "Derived from this device's browser agent." },
      { label: "Secure context", value: secure ? "HTTPS / secure" : "Insecure", note: "Passkeys require a secure context." },
      { label: "Passkey readiness", value: passkeySupported ? "Ready on this surface" : "Unavailable here", note: "Platform authenticator support detected by this browser." },
      { label: "Network", value: online ? "Online" : "Offline", note: "Live connection state for this surface." },
      { label: "Locale · timezone", value: `${lang} · ${tz}`, note: "Used for display and local formatting." },
      { label: "Appearance", value: theme, note: "Theme preference for this surface." },
      { label: "Board time", value: now.toLocaleString(), note: "Local clock when this board was refreshed." },
    ];
  }, [surfaceId, passkeySupported, now]);

  const accountState = isGuest ? "Guest session" : isAuthenticated ? "Fresh ID account" : "Signed out";
  const email = user?.email ?? "";
  const providers = user?.linkedAccounts?.map((account) => account.provider).filter(Boolean) ?? [];

  return (
    <section className="fresh-id-dashboard" aria-label="Fresh ID identity and security center">
      <div className="fresh-id-dashboard-shell">
        <aside className="fresh-id-dashboard-brand" aria-label="Fresh ID introduction">
          <div className="fresh-id-mark" aria-hidden="true">F</div>
          <p className="fresh-id-eyebrow">Fresh ID · Identity Center</p>
          <h1>One account. Everything connected.</h1>
          <p className="fresh-id-lede">
            A single human-facing surface for account creation, sign-in, credentials, privacy, policy, security,
            and the device surface you are using.
          </p>

          <div className="fresh-id-account-chip">
            <span className="fresh-id-status-dot" aria-hidden="true" />
            <div>
              <strong>{accountState}</strong>
              <small>{user?.fullName || "No account identity loaded"}</small>
            </div>
          </div>

          <ul className="fresh-id-promises">
            <li>Credentials are never displayed as secrets</li>
            <li>Passkeys are optional and device-controlled</li>
            <li>Security signals are separated from identity claims</li>
            <li>Privacy and policy stay visible before commitment</li>
          </ul>

          <button type="button" className="fresh-id-ghost" onClick={() => setActiveRoute("feed")}>
            ← Back to Fresh
          </button>
        </aside>

        <div className="fresh-id-dashboard-main">
          <nav className="fresh-id-dashboard-tabs" aria-label="Fresh ID sections">
            <button type="button" className={panel === "auth" ? "active" : ""} onClick={() => setPanel("auth")}>
              Sign in / Register
            </button>
            <button type="button" className={panel === "credentials" ? "active" : ""} onClick={() => setPanel("credentials")} disabled={!isAuthenticated}>
              Credentials
            </button>
            <button type="button" className={panel === "security" ? "active" : ""} onClick={() => setPanel("security")}>
              Security
            </button>
            <button type="button" className={panel === "surface" ? "active" : ""} onClick={() => setPanel("surface")}>
              Human surface
            </button>
            <button type="button" className={panel === "privacy" ? "active" : ""} onClick={() => setPanel("privacy")}>
              Privacy
            </button>
            <button type="button" className={panel === "policy" ? "active" : ""} onClick={() => setPanel("policy")}>
              Policy
            </button>
          </nav>

          {(error || message) && (
            <div className={error ? "fresh-id-feedback error" : "fresh-id-feedback"} role={error ? "alert" : "status"}>
              {error || message}
            </div>
          )}

          {panel === "auth" && (
            <div className="fresh-id-panel fresh-id-panel-auth">
              <header className="fresh-id-panel-head">
                <span className="fresh-id-kicker">STEP 1 · ACCOUNT</span>
                <h2>Sign in or create Fresh ID</h2>
                <p>Use email/password, Google, a passkey, or guest mode. Registration requires reviewing the Privacy and Policy sections on this same surface.</p>
              </header>
              {isAuthenticated ? (
                <div className="fresh-id-state-card">
                  <strong>You are already signed in.</strong>
                  <span>{user?.fullName || user?.username || "Fresh ID"} · {email ? maskEmail(email) : "email unavailable"}</span>
                  <div className="fresh-id-action-row">
                    <button type="button" className="fresh-id-primary" onClick={() => setPanel("credentials")}>Manage credentials</button>
                    <button type="button" className="fresh-id-ghost" onClick={() => setPanel("security")}>Open security center</button>
                  </div>
                </div>
              ) : (
                <AuthForm />
              )}
              {!isAuthenticated && (
                <p className="fresh-id-legal-foot">
                  Review{" "}
                  <button type="button" className="fresh-id-inline-link" onClick={() => setPanel("privacy")}>Privacy</button>{" "}
                  and{" "}
                  <button type="button" className="fresh-id-inline-link" onClick={() => setPanel("policy")}>Policy</button>
                  {" "}before creating an account. You can also inspect your{" "}
                  <button type="button" className="fresh-id-inline-link" onClick={() => setPanel("surface")}>human surface board</button>.
                </p>
              )}
            </div>
          )}

          {panel === "credentials" && (
            <div className="fresh-id-panel" role="region" aria-label="Fresh ID credentials">
              <header className="fresh-id-panel-head">
                <span className="fresh-id-kicker">CREDENTIALS · PRIVATE</span>
                <h2>Your account credentials</h2>
                <p>Manage how this Fresh ID can be accessed. Passwords are never readable here; only credential status is shown.</p>
              </header>

              <div className="fresh-id-security-grid">
                <article className="fresh-id-security-card">
                  <span className="fresh-id-card-label">ACCOUNT</span>
                  <strong>{user?.fullName || user?.username || "Fresh ID account"}</strong>
                  <span>{email ? maskEmail(email) : "Email unavailable"}</span>
                  <small>{user?.verified ? "Profile reports verified email" : "Email verification status is not confirmed"}</small>
                </article>
                <article className="fresh-id-security-card">
                  <span className="fresh-id-card-label">PASSWORD</span>
                  <strong>Password credential enabled</strong>
                  <span>••••••••••••</span>
                  <button type="button" className="fresh-id-small-button" onClick={() => setAuthView("forgot-password")}>Reset password</button>
                </article>
                <article className="fresh-id-security-card">
                  <span className="fresh-id-card-label">PASSKEYS</span>
                  <strong>{passkeys.length} registered</strong>
                  <span>{passkeySupported ? "This surface supports passkeys" : "This surface does not currently support passkeys"}</span>
                </article>
                <article className="fresh-id-security-card">
                  <span className="fresh-id-card-label">PROVIDERS</span>
                  <strong>{providers.length ? providers.join(" · ") : "Email"}</strong>
                  <span>Linked providers are shown without exposing provider secrets.</span>
                </article>
              </div>

              <div className="fresh-id-section-block">
                <div className="fresh-id-section-heading">
                  <div>
                    <span className="fresh-id-kicker">DEVICE ACCESS</span>
                    <h3>Passkeys & biometrics</h3>
                  </div>
                  <button
                    type="button"
                    className="fresh-id-primary"
                    onClick={() => void handleRegisterPasskey()}
                    disabled={!passkeySupported || passkeyBusy || loading}
                  >
                    {passkeyBusy ? "Working..." : "Add passkey"}
                  </button>
                </div>
                {passkeys.length === 0 ? (
                  <p className="fresh-id-muted">No passkeys are currently listed for this account.</p>
                ) : (
                  <div className="fresh-id-passkey-list">
                    {passkeys.map((passkey) => (
                      <article key={passkey.id} className="fresh-id-passkey-row">
                        <div>
                          <strong>{passkey.friendly_name || "Fresh ID passkey"}</strong>
                          <small>Created {formatDate(passkey.created_at)} · Last used {formatDate(passkey.last_used_at)}</small>
                        </div>
                        <button type="button" className="fresh-id-danger-button" onClick={() => void handleRemovePasskey(passkey.id)} disabled={passkeyBusy}>
                          Remove
                        </button>
                      </article>
                    ))}
                  </div>
                )}
                <p className="fresh-id-muted">
                  A passkey uses the authenticator controlled by your device or security key. Fresh receives the credential result, not your fingerprint or face data.
                </p>
              </div>

              <div className="fresh-id-section-block">
                <span className="fresh-id-kicker">SESSION</span>
                <h3>Current access</h3>
                <p className="fresh-id-muted">This page does not display access tokens, passwords, service credentials, or other secrets.</p>
                <button type="button" className="fresh-id-danger-button" onClick={() => void handleLogout()}>Sign out of Fresh ID</button>
              </div>
            </div>
          )}

          {panel === "security" && (
            <div className="fresh-id-panel" role="region" aria-label="Fresh ID security center">
              <header className="fresh-id-panel-head">
                <span className="fresh-id-kicker">STEPS 2–6 · SECURITY JOURNEY</span>
                <h2>Security center</h2>
                <p>A transparent security journey: use capabilities that actually exist, and clearly distinguish future intelligence from live controls.</p>
              </header>

              <div className="fresh-id-journey">
                <article className="fresh-id-journey-step active">
                  <span>01</span>
                  <div><strong>Account creation</strong><small>Email/password, Google, and guest entry are available on this surface.</small></div>
                </article>
                <article className="fresh-id-journey-step">
                  <span>02</span>
                  <div><strong>Email verification</strong><small>Fresh ID can require confirmation before password login when email confirmation is enabled.</small></div>
                </article>
                <article className="fresh-id-journey-step">
                  <span>03</span>
                  <div><strong>Passkey protection</strong><small>{passkeySupported ? "This browser reports passkey support." : "This browser does not currently report passkey support."} Register only when you choose.</small></div>
                </article>
                <article className="fresh-id-journey-step">
                  <span>04</span>
                  <div><strong>Security intelligence</strong><small>Behavioral signals such as typing rhythm or location should be opt-in, privacy-bounded, and server-governed; no hidden trust score is claimed by this UI.</small></div>
                </article>
                <article className="fresh-id-journey-step">
                  <span>05</span>
                  <div><strong>Risk alerts</strong><small>This surface is ready to display a real security event when an authoritative security service reports one. It does not fabricate alerts.</small></div>
                </article>
                <article className="fresh-id-journey-step">
                  <span>06</span>
                  <div><strong>Cross-platform identity</strong><small>Your Fresh ID is the account boundary for future web, mobile, tablet, and TV experiences; this browser only reports its current surface.</small></div>
                </article>
              </div>

              <div className="fresh-id-security-note">
                <strong>Design upgrade:</strong> behavioral profiling is not enabled merely because a screen exists. Any future risk engine should use data minimization, explicit controls, retention limits, explainable signals, server-side enforcement, and a recovery path that never depends on an opaque score.
              </div>

              {isAuthenticated && !isGuest ? (
                <button type="button" className="fresh-id-primary" onClick={() => setPanel("credentials")}>Review live credentials</button>
              ) : (
                <button type="button" className="fresh-id-primary" onClick={() => setPanel("auth")}>Continue to account access</button>
              )}
            </div>
          )}

          {panel === "surface" && (
            <div className="fresh-id-panel" role="region" aria-label="Human surface identifier board">
              <header className="fresh-id-panel-head">
                <span className="fresh-id-kicker">HUMAN SURFACE</span>
                <h2>Human surface identifier board</h2>
                <p>This board describes the browser surface you are using. It is not a passport, national ID, biometric score, reputation score, or identity verification claim.</p>
              </header>
              {isAuthenticated && !isGuest && (
                <div className="fresh-id-account-board">
                  <span className="fresh-id-card-label">ACCOUNT LINK</span>
                  <strong>{user?.fullName || user?.username || "Fresh ID"}</strong>
                  <span>{email ? maskEmail(email) : "Email unavailable"} · {accountState}</span>
                </div>
              )}
              <div className="fresh-id-surface-board">
                {surfaceRows.map((row) => (
                  <article key={row.label} className="fresh-id-surface-row">
                    <div>
                      <span className="fresh-id-surface-label">{row.label}</span>
                      <strong>{row.value}</strong>
                      <small>{row.note}</small>
                    </div>
                  </article>
                ))}
              </div>
              <p className="fresh-id-surface-disclaimer">
                The surface identifier is generated locally and is not a government identity. It should not be used to rank, profile, or deny people access. It is not automatically uploaded to Fresh.
              </p>
              <button type="button" className="fresh-id-primary" onClick={() => setPanel("auth")}>Continue to account access</button>
            </div>
          )}

          {panel === "privacy" && (
            <div className="fresh-id-panel" role="region" aria-label="Fresh privacy">
              <header className="fresh-id-panel-head">
                <span className="fresh-id-kicker">TRUST · PRIVACY</span>
                <h2>Privacy</h2>
                <p>Identity, credential, device-surface, and future security intelligence should remain understandable and controllable.</p>
              </header>
              <div className="fresh-id-doc">
                <h3>Account data</h3>
                <p>Account creation may include email, a password handled by the authentication provider, display name, and username. Google or passkey sign-in follows the provider/authenticator flow.</p>
                <h3>Surface data</h3>
                <p>The human surface identifier and display preferences are kept locally by this browser and are not automatically uploaded by this dashboard.</p>
                <h3>Security intelligence</h3>
                <p>Future behavioral or risk features must be separately governed. A UI label is not permission to collect typing patterns, precise location, or other telemetry. Fresh should expose purpose, controls, retention, and recovery before enabling such capabilities.</p>
                <h3>Secrets</h3>
                <p>Passwords, access tokens, service-role credentials, and biometric templates are not displayed on this surface. Privileged operations remain server-side.</p>
                <h3>Your controls</h3>
                <p>You can sign out, reset a password, manage passkeys, review this surface, and read the policy before account creation.</p>
              </div>
              <button type="button" className="fresh-id-primary" onClick={() => setPanel("auth")}>Back to account access</button>
            </div>
          )}

          {panel === "policy" && (
            <div className="fresh-id-panel" role="region" aria-label="Fresh policy">
              <header className="fresh-id-panel-head">
                <span className="fresh-id-kicker">TRUST · POLICY</span>
                <h2>Policy</h2>
                <p>Human-readable rules for Fresh ID and the Fresh Web Lite platform surface.</p>
              </header>
              <div className="fresh-id-doc">
                <h3>Acceptable use</h3>
                <p>Use Fresh for lawful purposes. Do not bypass authentication, abuse rate limits, harvest other people's data, or misrepresent guest sessions as verified accounts.</p>
                <h3>Identity honesty</h3>
                <p>Accounts should represent a person or organization you are authorized to represent. Impersonation, automated mass registration, and credential stuffing are prohibited.</p>
                <h3>Security integrity</h3>
                <p>Security controls must be server-authoritative. Future risk systems should provide meaningful explanations and recovery rather than silently treating a behavioral score as identity.</p>
                <h3>Platform integrity</h3>
                <p>TRUEMODE and other safety boundaries may block or caution high-risk actions. Do not attempt to disable or circumvent those controls.</p>
                <h3>Changes</h3>
                <p>Material policy changes should be presented on this identity surface so people can review them before registering or continuing.</p>
              </div>
              <button type="button" className="fresh-id-primary" onClick={() => setPanel("auth")}>Back to account access</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
