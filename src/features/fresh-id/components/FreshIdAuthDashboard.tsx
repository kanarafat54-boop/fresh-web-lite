/**
 * Fresh Web Lite — Independent Fresh ID Auth Dashboard
 * One surface for Log In, Register, Privacy, Policy, and Human Surface identity.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";
import { AuthForm } from "./AuthForm";
import "./FreshIdAuthDashboard.css";

type Panel = "auth" | "privacy" | "policy" | "surface";

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

export default function FreshIdAuthDashboard() {
  const { isAuthenticated, isGuest, passkeySupported, setAuthView } = useFreshId();
  const { setActiveRoute } = useLayout();
  const [panel, setPanel] = useState<Panel>("auth");
  const [surfaceId] = useState(readOrCreateSurfaceId);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setAuthView("form");
  }, [setAuthView]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      setActiveRoute("profile");
    }
  }, [isAuthenticated, isGuest, setActiveRoute]);

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
      { label: "Secure context", value: secure ? "HTTPS / secure" : "Insecure", note: "Passkeys and privileged auth require a secure context." },
      { label: "Passkey readiness", value: passkeySupported ? "Ready on this surface" : "Unavailable here", note: "Biometric / platform authenticator support." },
      { label: "Network", value: online ? "Online" : "Offline", note: "Live connection state for this surface." },
      { label: "Locale · timezone", value: `${lang} · ${tz}`, note: "Used only for display and local formatting." },
      { label: "Appearance", value: theme, note: "Theme preference for this surface." },
      { label: "Board time", value: now.toLocaleString(), note: "Local clock when this board was last refreshed." },
    ];
  }, [surfaceId, passkeySupported, now]);

  return (
    <section className="fresh-id-dashboard" aria-label="Fresh ID sign in and registration">
      <div className="fresh-id-dashboard-shell">
        <aside className="fresh-id-dashboard-brand" aria-label="Fresh ID introduction">
          <div className="fresh-id-mark" aria-hidden="true">
            F
          </div>
          <p className="fresh-id-eyebrow">Fresh ID</p>
          <h1>One account. Everything connected.</h1>
          <p className="fresh-id-lede">
            Sign in or create your Fresh ID on this independent surface. Privacy, policy, and the human surface you are
            using stay visible before you commit.
          </p>
          <ul className="fresh-id-promises">
            <li>Your identity stays under your control</li>
            <li>Guest mode never pretends to be a real account</li>
            <li>Auth happens on a dedicated dashboard, not a hidden overlay</li>
          </ul>
          <button type="button" className="fresh-id-ghost" onClick={() => setActiveRoute("feed")}>
            ← Back to Fresh
          </button>
        </aside>

        <div className="fresh-id-dashboard-main">
          <nav className="fresh-id-dashboard-tabs" aria-label="Auth dashboard sections">
            <button type="button" className={panel === "auth" ? "active" : ""} onClick={() => setPanel("auth")}>
              Sign in / Register
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

          {panel === "auth" && (
            <div className="fresh-id-panel fresh-id-panel-auth">
              <header className="fresh-id-panel-head">
                <h2>Sign in or create Fresh ID</h2>
                <p>Log in, register, use Google or passkeys, or continue as guest. This is the only auth entry surface.</p>
              </header>
              <AuthForm />
              <p className="fresh-id-legal-foot">
                By continuing you acknowledge Fresh{" "}
                <button type="button" className="fresh-id-inline-link" onClick={() => setPanel("privacy")}>
                  Privacy
                </button>{" "}
                and{" "}
                <button type="button" className="fresh-id-inline-link" onClick={() => setPanel("policy")}>
                  Policy
                </button>
                . Review your{" "}
                <button type="button" className="fresh-id-inline-link" onClick={() => setPanel("surface")}>
                  human surface identifier
                </button>{" "}
                before registering.
              </p>
            </div>
          )}

          {panel === "surface" && (
            <div className="fresh-id-panel" role="region" aria-label="Human surface identifier board">
              <header className="fresh-id-panel-head">
                <h2>Human surface identifier board</h2>
                <p>
                  This board describes the browser surface you are using to enter Fresh. It is not a passport, national
                  ID, or biometric score. It helps you and Fresh recognize the same human surface across sessions on
                  this device.
                </p>
              </header>
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
                Fresh does not use this board to rank people or deny service. Surface IDs stay on-device unless you
                explicitly link them to a signed-in Fresh ID account in a later security setting.
              </p>
              <button type="button" className="fresh-id-primary" onClick={() => setPanel("auth")}>
                Continue to Sign in / Register
              </button>
            </div>
          )}

          {panel === "privacy" && (
            <div className="fresh-id-panel" role="region" aria-label="Fresh privacy">
              <header className="fresh-id-panel-head">
                <h2>Privacy</h2>
                <p>How Fresh treats identity, session, and surface data on this platform.</p>
              </header>
              <div className="fresh-id-doc">
                <h3>What Fresh collects for Fresh ID</h3>
                <p>
                  Account creation may include email, password (handled by Supabase Auth), display name, and username.
                  Optional Google or passkey sign-in uses those providers' flows. Guest mode does not create a durable
                  cloud identity.
                </p>
                <h3>What stays on this surface</h3>
                <p>
                  Theme preference, first-experience completion flags, and the human surface identifier are stored in
                  this browser's local storage. They are not uploaded automatically.
                </p>
                <h3>What Fresh does not do here</h3>
                <p>
                  Fresh does not sell personal data from this dashboard. Service-role credentials never run in the
                  browser. Privileged treasury and admin operations stay on authenticated server boundaries.
                </p>
                <h3>Your controls</h3>
                <p>
                  You can sign out, request password reset, and later remove passkeys from account security settings.
                  Content you save or post is governed by the feature that stores it and by platform policy.
                </p>
              </div>
              <button type="button" className="fresh-id-primary" onClick={() => setPanel("auth")}>
                Back to Sign in / Register
              </button>
            </div>
          )}

          {panel === "policy" && (
            <div className="fresh-id-panel" role="region" aria-label="Fresh policy">
              <header className="fresh-id-panel-head">
                <h2>Policy</h2>
                <p>Terms of use for Fresh ID and the Fresh Web Lite platform surface.</p>
              </header>
              <div className="fresh-id-doc">
                <h3>Acceptable use</h3>
                <p>
                  Use Fresh for lawful purposes. Do not attempt to bypass authentication, abuse rate limits, harvest
                  other people's data, or present guest sessions as verified accounts.
                </p>
                <h3>Identity honesty</h3>
                <p>
                  Fresh ID accounts should represent a real person or organization you are authorized to represent.
                  Impersonation, automated mass registration, and credential stuffing are prohibited.
                </p>
                <h3>Platform integrity</h3>
                <p>
                  TRUEMODE and safety boundaries may block or caution high-risk actions. Do not attempt to disable
                  safety systems. Server-side decisions remain authoritative for privileged operations.
                </p>
                <h3>Changes</h3>
                <p>
                  Fresh may update this policy as the platform evolves. Material changes will be reflected on this
                  independent auth dashboard so they remain readable at sign-in and registration time.
                </p>
              </div>
              <button type="button" className="fresh-id-primary" onClick={() => setPanel("auth")}>
                Back to Sign in / Register
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
