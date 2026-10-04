/**
 * Fresh Web Lite — Independent Fresh ID Gateway
 *
 * Fresh ID is intentionally separate from the main FWL application shell.
 * The gateway presents the complete identity journey first, then hands the
 * authenticated user into Fresh Web Lite.
 */

import { useEffect, useState, type WheelEvent, type TouchEvent } from "react";
import { useFreshId } from "../context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";
import { AuthForm } from "./AuthForm";
import "./FreshIdAuthDashboard.css";

type Layer = "welcome" | "auth" | "verify" | "credentials" | "security" | "privacy" | "ready";

const journeySteps: Array<{
  id: Layer;
  number: string;
  title: string;
  description: string;
  icon: string;
}> = [
  { id: "welcome", number: "01", title: "Welcome", description: "Start your Fresh identity", icon: "✦" },
  { id: "auth", number: "02", title: "Account", description: "Sign in or create", icon: "◎" },
  { id: "verify", number: "03", title: "Verify", description: "Confirm your access", icon: "✓" },
  { id: "credentials", number: "04", title: "Secure", description: "Passkeys & credentials", icon: "⌁" },
  { id: "security", number: "05", title: "Security", description: "Sessions & controls", icon: "◇" },
  { id: "privacy", number: "06", title: "Privacy", description: "Understand your surface", icon: "◌" },
  { id: "ready", number: "07", title: "Enter Fresh", description: "Continue to FWL", icon: "→" },
];

function readSurfaceId(): string {
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

export default function FreshIdAuthDashboard() {
  const {
    user,
    isAuthenticated,
    isGuest,
    authView,
    passkeySupported,
    loading,
    error,
    message,
    setAuthView,
    registerPasskey,
    listPasskeys,
    logout,
  } = useFreshId();
  const { setActiveRoute } = useLayout();
  const [layer, setLayer] = useState<Layer>(() => typeof window !== "undefined" && window.location.pathname.startsWith("/auth/") ? "auth" : "welcome");
  const [surfaceId] = useState(readSurfaceId);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [passkeys, setPasskeys] = useState<Array<{ id: string; friendly_name?: string; created_at: string }>>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const standaloneAuth = typeof window !== "undefined" && window.location.pathname.startsWith("/auth/");

  const layers: Layer[] = journeySteps.map((step) => step.id);
  const layerIndex = layers.indexOf(layer);

  useEffect(() => {
    setAuthView("form");
  }, [setAuthView]);

  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      setPasskeys([]);
      return;
    }
    let cancelled = false;
    void listPasskeys().then((items) => {
      if (!cancelled) setPasskeys(items as Array<{ id: string; friendly_name?: string; created_at: string }>);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isGuest, listPasskeys]);

  useEffect(() => {
    if (authView === "check-email") setLayer("verify");
    if (isAuthenticated && !isGuest) {
      let onboarded = false;
      try {
        onboarded = window.localStorage.getItem("fresh.id.onboarded") === "1";
      } catch {
        // local preference only; authentication remains server authoritative.
      }
      setLayer(onboarded ? "ready" : "credentials");
    }
  }, [authView, isAuthenticated, isGuest]);

  function go(next: Layer) {
    setLayer(next);
  }

  function advance() {
    const next = layers[Math.min(layerIndex + 1, layers.length - 1)];
    setLayer(next);
  }

  function back() {
    const next = layers[Math.max(layerIndex - 1, 0)];
    setLayer(next);
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    const primaryDelta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(primaryDelta) < 18) return;
    event.preventDefault();
    if (primaryDelta > 0 && layer !== "privacy") advance();
    if (primaryDelta < 0) back();
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    setTouchStart(event.touches[0]?.clientX ?? null);
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStart === null) return;
    const end = event.changedTouches[0]?.clientX ?? touchStart;
    const delta = touchStart - end;
    if (Math.abs(delta) > 48) {
      if (delta > 0 && layer !== "privacy") advance();
      if (delta < 0) back();
    }
    setTouchStart(null);
  }

  async function addPasskey() {
    setPasskeyBusy(true);
    const created = await registerPasskey();
    if (created) setPasskeys((current) => [...current, created as { id: string; friendly_name?: string; created_at: string }]);
    setPasskeyBusy(false);
  }

  async function signOut() {
    await logout();
    setLayer("auth");
  }

  const surfaceClass = typeof navigator === "undefined"
    ? "Browser"
    : /Android/i.test(navigator.userAgent)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? "Apple"
        : /Windows/i.test(navigator.userAgent)
          ? "Windows"
          : /Macintosh/i.test(navigator.userAgent)
            ? "Mac"
            : "Browser";

  function enterFresh() {
    try {
      window.localStorage.setItem("fresh.id.onboarded", "1");
    } catch {
      // The main application still uses the authoritative auth session.
    }
    setActiveRoute("feed");
  }

  return (
    <main
      className={`fresh-id-gateway ${standaloneAuth ? "fresh-id-standalone-auth" : ""}`}
      aria-label="Fresh ID authentication gateway"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {!standaloneAuth && <div className="fresh-id-gateway-top">
        <div className="fresh-id-gateway-brand" aria-label="Fresh ID">
          <span className="fresh-id-gateway-mark" aria-hidden="true">F</span>
          <span>Fresh ID</span>
        </div>
        <div className="fresh-id-gateway-context">
          <span className="fresh-id-context-label">IDENTITY GATEWAY</span>
          <span className="fresh-id-context-line" />
          <span className="fresh-id-context-status">Private by design</span>
        </div>
        <div className="fresh-id-progress" aria-label={`Layer ${layerIndex + 1} of 7`}>
          <span>{String(layerIndex + 1).padStart(2, "0")}</span>
          <i />
          <span>07</span>
        </div>
      </div>}

      <div className="fresh-id-layer">
        {layer === "welcome" && (
          <section className="fresh-id-screen fresh-id-screen-overview" aria-labelledby="fresh-welcome-title">
            <div className="fresh-id-overview-head">
              <div>
                <p className="fresh-id-overline">FRESH ID · SECURE IDENTITY GATEWAY</p>
                <h1 id="fresh-welcome-title">One identity.<br /><em>Everything Fresh.</em></h1>
                <p className="fresh-id-overview-lede">
                  Create one secure identity for Fresh Web Lite and the experiences that follow.
                  The gateway stays separate from the product you are entering.
                </p>
              </div>
              <div className="fresh-id-capability-rail" aria-label="Fresh ID capabilities">
                <span><b>◎</b> Unified identity</span>
                <span><b>⌁</b> Passkey access</span>
                <span><b>◇</b> Security controls</span>
                <span><b>◌</b> Privacy clarity</span>
              </div>
            </div>

            <div className="fresh-id-journey-board" aria-label="Fresh ID journey">
              {journeySteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={`fresh-id-journey-step ${index === layerIndex ? "active" : ""}`}
                  onClick={() => go(step.id)}
                  aria-current={index === layerIndex ? "step" : undefined}
                >
                  <span className="fresh-id-step-number">{step.number}</span>
                  <span className="fresh-id-step-icon" aria-hidden="true">{step.icon}</span>
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                  {index < journeySteps.length - 1 && <i className="fresh-id-journey-connector" aria-hidden="true">→</i>}
                </button>
              ))}
            </div>

            <div className="fresh-id-overview-stage">
              <div className="fresh-id-overview-copy">
                <span className="fresh-id-stage-kicker">01 · WELCOME</span>
                <h2>Designed as a gateway, not another app screen.</h2>
                <p>
                  Move through identity, verification, credentials, security and privacy in one calm
                  environment. When you are ready, Fresh ID disappears and Fresh Web Lite takes over.
                </p>
                <div className="fresh-id-overview-actions">
                  <button className="fresh-id-primary" type="button" onClick={advance}>Create or sign in</button>
                  <button className="fresh-id-text-button" type="button" onClick={() => go("privacy")}>Read privacy first</button>
                </div>
              </div>

              <div className="fresh-id-device-preview" aria-label="Fresh ID mobile preview">
                <div className="fresh-id-device">
                  <div className="fresh-id-device-speaker" />
                  <div className="fresh-id-device-screen">
                    <div className="fresh-id-device-top"><span>9:41</span><span>● ●</span></div>
                    <div className="fresh-id-device-mark">F</div>
                    <span className="fresh-id-device-overline">FRESH ID</span>
                    <h3>Your identity,<br /><em>your way in.</em></h3>
                    <p>One secure gateway into everything Fresh.</p>
                    <button type="button" onClick={advance}>Continue</button>
                    <small>Private by design</small>
                  </div>
                </div>
                <div className="fresh-id-device-caption">
                  <span>HUMAN SURFACE</span>
                  <b>01</b>
                </div>
              </div>
            </div>
          </section>
        )}

        {layer === "auth" && (
          <section className="fresh-id-screen fresh-id-screen-form" aria-labelledby="fresh-auth-title">
            <div className="fresh-id-auth-shell">
              <div className="fresh-id-auth-identity">
                <div className="fresh-id-auth-orb" aria-hidden="true">
                  <span>F</span>
                  <i />
                </div>
                <p className="fresh-id-overline">02 · ACCOUNT</p>
                <h1 id="fresh-auth-title">Your identity.<br /><em>Your way into Fresh.</em></h1>
                <p>One focused gateway. Sign in, create your Fresh ID, then the identity surface gets out of your way.</p>
                <div className="fresh-id-provider-constellation" aria-hidden="true">
                  <span className="provider-symbol google">G</span>
                  <span className="provider-symbol apple">●</span>
                  <span className="provider-symbol facebook">f</span>
                  <span className="provider-symbol x">𝕏</span>
                </div>
                <small>Connected identity providers appear as symbols, not oversized labels.</small>
              </div>
              <div className="fresh-id-form-stage">
                <AuthForm />
              </div>
            </div>
            {!standaloneAuth && <div className="fresh-id-lower-actions">
              <button type="button" className="fresh-id-text-button" onClick={() => go("privacy")}>Privacy</button>
              <button type="button" className="fresh-id-text-button" onClick={() => go("security")}>Security</button>
              <button type="button" className="fresh-id-text-button" onClick={() => go("welcome")}>Overview</button>
            </div>}
          </section>
        )}

        {layer === "verify" && (
          <section className="fresh-id-screen fresh-id-screen-centered" aria-labelledby="fresh-verify-title">
            <div className="fresh-id-step-icon" aria-hidden="true">03</div>
            <p className="fresh-id-overline">03 · VERIFICATION</p>
            <h1 id="fresh-verify-title">Check your email.</h1>
            <p className="fresh-id-lede">Confirm the address you used to create your Fresh ID. Return here after confirmation.</p>
            <div className="fresh-id-notice">{message || "A verification message has been requested."}</div>
            <button className="fresh-id-primary" type="button" onClick={() => go("auth")}>Back to account</button>
            <p className="fresh-id-micro">Already verified? Sign in above and Fresh will continue automatically.</p>
          </section>
        )}

        {layer === "credentials" && (
          <section className="fresh-id-screen fresh-id-screen-detail" aria-labelledby="fresh-credentials-title">
            <div className="fresh-id-detail-copy">
              <p className="fresh-id-overline">04 · CREDENTIALS</p>
              <h1 id="fresh-credentials-title">Secure your access.</h1>
              <p>Choose how you want to access Fresh. Passwords remain secrets; passkeys use the authenticator controlled by your device.</p>
            </div>
            <div className="fresh-id-detail-grid">
              <article className="fresh-id-info-card">
                <span>ACCOUNT</span>
                <strong>{user?.fullName || user?.username || "Fresh ID"}</strong>
                <small>{user?.email || "Account email"}</small>
              </article>
              <article className="fresh-id-info-card">
                <span>PASSKEY</span>
                <strong>{passkeys.length ? `${passkeys.length} registered` : "Not configured"}</strong>
                <small>{passkeySupported ? "This surface supports passkeys." : "Passkeys are unavailable on this surface."}</small>
                {passkeySupported && (
                  <button className="fresh-id-secondary" type="button" disabled={passkeyBusy || loading} onClick={() => void addPasskey()}>
                    {passkeyBusy ? "Working…" : "Add passkey"}
                  </button>
                )}
              </article>
            </div>
            <div className="fresh-id-detail-actions">
              <button className="fresh-id-primary" type="button" onClick={advance}>Continue</button>
              <button className="fresh-id-text-button" type="button" onClick={() => go("auth")}>Back to account</button>
            </div>
          </section>
        )}

        {layer === "security" && (
          <section className="fresh-id-screen fresh-id-screen-detail" aria-labelledby="fresh-security-title">
            <div className="fresh-id-detail-copy">
              <p className="fresh-id-overline">05 · SECURITY</p>
              <h1 id="fresh-security-title">Security without mystery.</h1>
              <p>Live controls are shown as live controls. Future intelligence is clearly marked instead of pretending to be active.</p>
            </div>
            <div className="fresh-id-security-list">
              <article><b>Sessions</b><span>Sign out of this Fresh ID when you are finished. Tokens and passwords are never displayed here.</span></article>
              <article><b>Passkeys</b><span>Device authentication can be enabled when your browser and authenticator support it.</span></article>
              <article><b>Risk intelligence</b><span>Future behavioral signals must be opt-in, minimized, explainable, time-bounded and server-governed. No hidden trust score is claimed.</span></article>
              <article><b>Recovery</b><span>Password recovery and credential replacement remain available when access is lost.</span></article>
            </div>
            {isAuthenticated && !isGuest && <button className="fresh-id-danger" type="button" onClick={() => void signOut()}>Sign out of Fresh ID</button>}
            <button className="fresh-id-primary" type="button" onClick={advance}>Continue</button>
          </section>
        )}

        {layer === "privacy" && (
          <section className="fresh-id-screen fresh-id-screen-document" aria-labelledby="fresh-privacy-title">
            <div className="fresh-id-document-wrap">
              <p className="fresh-id-overline">06 · PRIVACY & POLICY</p>
              <h1 id="fresh-privacy-title">Read before you decide.</h1>
              <p className="fresh-id-document-lede">This layer intentionally supports normal reading and scrolling. It is separate from the action layers.</p>
              <div className="fresh-id-document">
                <h2>Account data</h2>
                <p>Fresh ID may use account information required for authentication and profile creation. Passwords and authentication secrets are handled by the authentication system and are never displayed here.</p>
                <h2>Surface data</h2>
                <p>Your local Human Surface ID is a browser-generated identifier for this surface. It is not a government ID, reputation score, biometric score, or identity verification.</p>
                <h2>Security intelligence</h2>
                <p>Future behavioral or risk features require separate governance. A screen existing does not grant permission to collect typing patterns, precise location, or other telemetry.</p>
                <h2>Policy</h2>
                <p>Use Fresh lawfully, protect your credentials, do not impersonate others, abuse authentication systems, or attempt to circumvent security controls. Material policy changes should be presented for review.</p>
                <h2>Your surface</h2>
                <p><b>Human Surface ID:</b> {surfaceId}<br /><b>Surface class:</b> {surfaceClass}</p>
              </div>
              <div className="fresh-id-document-actions">
                <button className="fresh-id-primary" type="button" onClick={advance}>I’m ready</button>
                <button className="fresh-id-text-button" type="button" onClick={() => go("auth")}>Back to account</button>
              </div>
            </div>
          </section>
        )}

        {layer === "ready" && (
          <section className="fresh-id-screen fresh-id-screen-centered fresh-id-ready" aria-labelledby="fresh-ready-title">
            <div className="fresh-id-ready-check" aria-hidden="true">✓</div>
            <p className="fresh-id-overline">07 · READY</p>
            <h1 id="fresh-ready-title">Your Fresh ID is ready.</h1>
            <p className="fresh-id-lede">Fresh ID is complete. The authentication environment ends here.</p>
            {error && <div className="fresh-id-notice error" role="alert">{error}</div>}
            <button className="fresh-id-primary fresh-id-enter" type="button" onClick={enterFresh}>Enter Fresh Web Lite</button>
            <p className="fresh-id-micro">Fresh ID will disappear and the full Fresh Web Lite application will take over.</p>
          </section>
        )}
      </div>

      {!standaloneAuth && <div className="fresh-id-gateway-bottom">
        <button type="button" className="fresh-id-nav-arrow" onClick={back} disabled={layerIndex === 0} aria-label="Previous layer">←</button>
        <span>Swipe sideways to move through layers</span>
        <button type="button" className="fresh-id-nav-arrow" onClick={advance} disabled={layerIndex === layers.length - 1} aria-label="Next layer">→</button>
      </div>}
    </main>
  );
}
