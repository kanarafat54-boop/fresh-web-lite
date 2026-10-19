/**
 * Fresh Web Lite
 * Fresh ID Auth Form
 */

import { useEffect, useState } from "react";
import { useLayout } from "../../../app/contexts/useLayout";
import { useFreshId } from "../context/FreshIdContext";
import { supabase } from "../../../lib/supabase";

export function AuthForm() {
  const {
    login,
    loginWithPasskey,
    loginAsGuest,
    loading,
    error,
    message,
    authView,
    setAuthView,
    requestPasswordReset,
    updatePassword,
    register,
    passkeySupported,
  } = useFreshId();

  const { activeRoute } = useLayout();
  const initialMode = activeRoute === "auth-signup" || (typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/auth/sign-up") ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<"personal" | "creator" | "business" | "developer" | "organization">("personal");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "");
    if (activeRoute === "auth-signup" || path === "/auth/sign-up") setMode("register");
    else if (activeRoute === "auth-signin" || path === "/auth/sign-in") setMode("login");
  }, [activeRoute]);

  async function handleSocialSignIn(provider: "google" | "apple" | "meta" | "x" | "whatsapp" | "telegram" | "tiktok") {
    setSocialError(null);
    if (provider === "whatsapp" || provider === "telegram" || provider === "tiktok") {
      const labels = { whatsapp: "WhatsApp", telegram: "Telegram", tiktok: "TikTok" } as const;
      setSocialError(labels[provider] + " sign-in is not connected yet. Its official authentication integration must be configured before this option can work.");
      return;
    }
    setSocialLoading(provider);
    const oauthProvider = provider === "x" ? "twitter" : provider === "meta" ? "facebook" : provider;
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo: new URL("/auth/sign-in", window.location.origin).toString(),
          queryParams: provider === "google" ? { access_type: "offline", prompt: "select_account" } : undefined,
        },
      });
      if (oauthError) {
        setSocialError(oauthError.message);
        setSocialLoading(null);
      }
    } catch {
      setSocialError("We couldn't reach the sign-in provider. Check your connection and try again.");
      setSocialLoading(null);
    }
  }

  const socialProviders = [
    { id: "google" as const, label: "Google", symbol: "G", className: "google", title: "Continue with Google" },
    { id: "apple" as const, label: "Apple", symbol: "●", className: "apple", title: "Continue with Apple" },
    { id: "meta" as const, label: "Meta", symbol: "∞", className: "meta", title: "Continue with Meta" },
    { id: "x" as const, label: "X", symbol: "𝕏", className: "x", title: "Continue with X" },
    { id: "whatsapp" as const, label: "WhatsApp", symbol: "◔", className: "whatsapp", title: "Continue with WhatsApp" },
    { id: "telegram" as const, label: "Telegram", symbol: "➤", className: "telegram", title: "Continue with Telegram" },
    { id: "tiktok" as const, label: "TikTok", symbol: "♪", className: "tiktok", title: "Continue with TikTok" },
  ];

  async function handleRegister() {
    setSignupError(null);

    if (!policyAccepted) {
      setSignupError("Please review and accept the Privacy and Policy sections before creating your Fresh ID.");
      return;
    }

    if (password.length < 12) {
      setSignupError("Use at least 12 characters for a stronger password.");
      return;
    }
    if (password !== confirmPassword) {
      setSignupError("Your passwords do not match. Please check both fields.");
      return;
    }

    await register(email.trim(), password, username.trim(), fullName.trim(), accountType);
  }

  function handleSubmit() {
    if (mode === "login") {
      void login(email, password);
    } else {
      void handleRegister();
    }
  }

  if (authView === "check-email") {
    return (
      <div className="auth-form">
        <p className="auth-message">
          Your Fresh Web Lite account was created. Check your email to confirm it,
          then return here and log in.
        </p>
        <button className="auth-tab" onClick={() => setAuthView("form")}>
          Back to Log In
        </button>
        <button className="guest-btn" onClick={loginAsGuest}>
          Continue as Guest for now
        </button>
      </div>
    );
  }

  if (authView === "forgot-password") {
    return (
      <div className="auth-form">
        <h3>Reset your password</h3>
        <label className="auth-field"><span className="auth-field-label">Email address</span><input className="auth-input" name="email" autoComplete="email" aria-label="Email address" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-message">{message}</p>}
        <button className="auth-submit-btn" onClick={() => void requestPasswordReset(email)} disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        <button className="auth-tab" onClick={() => setAuthView("form")}>Back to Log In</button>
      </div>
    );
  }

  if (authView === "reset-password") {
    return (
      <div className="auth-form">
        <h3>Choose a new password</h3>
        <label className="auth-field"><span className="auth-field-label">New password</span><input className="auth-input" name="new-password" autoComplete="new-password" aria-label="New password" placeholder="At least 12 characters" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={12} /></label>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-message">{message}</p>}
        <button className="auth-submit-btn" onClick={() => void updatePassword(newPassword)} disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="auth-tabs" aria-label="Fresh ID account access">
        <button className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("login"); setSignupError(null); if (window.location.pathname !== "/auth/sign-in") window.history.replaceState({ freshRoute: "auth-signin" }, "", "/auth/sign-in"); }}>Log In</button>
        <button className={mode === "register" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("register"); setSignupError(null); if (window.location.pathname !== "/auth/sign-up") window.history.replaceState({ freshRoute: "auth-signup" }, "", "/auth/sign-up"); }}>Sign Up</button>
      </div>

      {mode === "register" && (
        <>
          <label className="auth-field"><span className="auth-field-label">Full name</span><input className="auth-input" name="name" autoComplete="name" aria-label="Full name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={80} /></label>
          <label className="auth-field"><span className="auth-field-label">Username</span><input className="auth-input" name="username" autoComplete="username" aria-label="Username" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32))} required minLength={3} maxLength={32} /></label>
          <label className="auth-field">
            <span className="auth-field-label">What kind of Fresh account do you need?</span>
            <select className="auth-input" name="fresh-account-type" value={accountType} onChange={(e) => setAccountType(e.target.value as typeof accountType)}>
              <option value="personal">Personal — social, search and everyday use</option>
              <option value="creator">Creator — publish and grow an audience</option>
              <option value="business">Business — manage a business presence</option>
              <option value="developer">Developer — build and integrate tools</option>
              <option value="organization">Organization — collaborate with a team</option>
            </select>
            <small className="auth-field-help">Creator, business, developer and organization choices create a workspace after your Fresh ID is authenticated. You can add more workspaces later.</small>
          </label>
        </>
      )}

      <label className="auth-field"><span className="auth-field-label">Email address</span><input className="auth-input" name="email" autoComplete="email" aria-label="Email address" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value.trimStart())} required /></label>
      <div className="auth-field auth-password-field"><label className="auth-field-label" htmlFor="fresh-id-password">Password</label><input id="fresh-id-password" className="auth-input" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} aria-label="Password" placeholder={mode === "login" ? "Enter your password" : "At least 12 characters"} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 12 : undefined} /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div>
      {mode === "register" && (
        <div className="auth-field auth-password-field"><label className="auth-field-label" htmlFor="fresh-id-confirm-password">Confirm password</label><input id="fresh-id-confirm-password" className="auth-input" name="confirm-password" autoComplete="new-password" aria-label="Confirm password" placeholder="Enter the same password again" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={12} /><button className="auth-password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}>{showConfirmPassword ? "Hide" : "Show"}</button></div>
      )}

      {error && <p className="auth-error">{error}</p>}
      {signupError && <p className="auth-error">{signupError}</p>}

      {mode === "register" && (
        <label className="auth-policy-check">
          <input type="checkbox" checked={policyAccepted} onChange={(e) => setPolicyAccepted(e.target.checked)} />
          <span>I have reviewed the <strong>Privacy</strong> and <strong>Policy</strong> sections on this page.</span>
        </label>
      )}
      {message && <p className="auth-message">{message}</p>}
      {socialError && <p className="auth-error">Sign-in provider: {socialError}</p>}

      <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading || Boolean(socialLoading)}>
        {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
      </button>

      {mode === "login" && (
        <>
          <div className="auth-social-divider"><span>or continue with</span></div>
          <div className="auth-social-grid" aria-label="Social sign-in providers">
            {socialProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className={`auth-social-btn ${provider.className}`}
                onClick={() => void handleSocialSignIn(provider.id)}
                disabled={loading || Boolean(socialLoading)}
                aria-label={provider.title}
                title={provider.title}
              >
                <span className="auth-social-symbol" aria-hidden="true">
                  {provider.id === "google" ? (
                    <svg viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/></svg>
                  ) : provider.id === "apple" ? (
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 12.53c-.02-2.2 1.8-3.27 1.88-3.32-1.03-1.5-2.64-1.71-3.2-1.73-1.35-.14-2.66.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.47.02-2.82.85-3.57 2.17-1.53 2.66-.39 6.57 1.1 8.72.73 1.05 1.59 2.23 2.72 2.19 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.86.69 1.18-.02 1.92-1.07 2.65-2.12.84-1.22 1.19-2.4 1.21-2.46-.03-.01-2.32-.89-2.34-3.47ZM14.86 6.05c.61-.74 1.02-1.77.91-2.8-.88.04-1.95.59-2.58 1.32-.56.65-1.06 1.69-.92 2.68.98.08 1.98-.5 2.59-1.2Z"/></svg>
                  ) : provider.id === "meta" ? (
                    <svg viewBox="0 0 32 20" aria-hidden="true"><path fill="#0866FF" d="M5.5 16.8C2.4 16.8 0 13.8 0 9.9S2.4 3 5.5 3c3 0 4.6 2.2 6.2 5.1C13.3 4.2 14.9 2 17.9 2c3.1 0 5.5 3 5.5 6.9s-2.4 6.9-5.5 6.9c-3 0-4.6-2.2-6.2-5.1-1.6 2.9-3.2 5.1-6.2 5.1Zm0-2.6c1.7 0 2.9-1.8 4.2-4.3C8.4 7.4 7.2 5.6 5.5 5.6 3.9 5.6 2.7 7.4 2.7 9.9s1.2 4.3 2.8 4.3Zm12.4 0c1.6 0 2.8-1.8 2.8-4.3s-1.2-4.3-2.8-4.3c-1.7 0-2.9 1.8-4.2 4.3 1.3 2.5 2.5 4.3 4.2 4.3Z" transform="translate(4 0)"/></svg>
                  ) : provider.id === "whatsapp" ? (
                    <svg viewBox="0 0 24 24"><path fill="#25D366" d="M12 2a9.7 9.7 0 0 0-8.35 14.64L2.4 22l5.5-1.2A9.8 9.8 0 1 0 12 2Z"/><path fill="#fff" d="M16.6 14.5c-.2.6-1 1-1.7 1.2-.5.1-1 .2-3.3-.8-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.3.7-2 1-2.3.2-.2.5-.3.7-.3h.5c.2 0 .4-.1.6.4l.8 2c.1.2.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.7 1.1 1.5 1.8 1 .9 1.8 1.2 2.1 1.3.2.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.1.1.7-.1 1.1Z" transform="translate(3 3) scale(.8)"/></svg>
                  ) : provider.id === "telegram" ? (
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#229ED9"/><path fill="#fff" d="m5.1 11.5 12.2-4.7c.57-.2 1.07.14.88 1l-2.08 9.8c-.15.7-.57.86-1.15.54l-3.2-2.36-1.55 1.5c-.17.17-.3.3-.6.3l.23-3.25 5.92-5.35c.26-.23-.06-.36-.4-.13L8.03 13.4l-3.16-.99c-.69-.22-.7-.69.23-.91Z"/></svg>
                  ) : provider.id === "tiktok" ? (
                    <svg viewBox="0 0 24 24"><path fill="#25F4EE" d="M16.8 2h-3.5v13.2a2.7 2.7 0 1 1-2.7-2.7c.4 0 .8.08 1.15.25V9.2a6.2 6.2 0 1 0 5.05 6.08V8.55a8.1 8.1 0 0 0 4.2 1.17V6.2c-2.4-.1-4.2-1.85-4.2-4.2Z"/><path fill="#FE2C55" d="M15.2 3.1h-1.9v13.2a2.7 2.7 0 0 1-4.5 2.02 2.7 2.7 0 0 0 4.5-2.02V3.1h1.9Zm1.6 3.2v2.2a8.1 8.1 0 0 0 4.2 1.17V7.4a7.7 7.7 0 0 1-4.2-1.1Z"/><path fill="#fff" d="M16.8 2h-3.5v13.2a2.7 2.7 0 1 1-2.7-2.7c.4 0 .8.08 1.15.25V9.2a6.2 6.2 0 1 0 5.05 6.08V8.55a8.1 8.1 0 0 0 4.2 1.17V6.2c-2.4-.1-4.2-1.85-4.2-4.2Z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.62L5.38 22H2.25l7.25-8.29L1.8 2h6.4l4.43 6.96L18.9 2Zm-1.1 17.9h1.73L7.27 4H5.42l12.38 15.9Z"/></svg>
                  )}
                </span>
                <span className="auth-social-label">{provider.label}</span>
              </button>
            ))}
          </div>

          <button
            className="auth-submit-btn"
            onClick={() => void loginWithPasskey()}
            disabled={loading || Boolean(socialLoading) || !passkeySupported}
            title={!passkeySupported ? "Passkeys require HTTPS/localhost and browser support" : "Use your device biometric, PIN, or security key"}
          >
            {loading ? "Verifying..." : passkeySupported ? "Sign in with biometrics" : "Biometrics unavailable here"}
          </button>
          {!passkeySupported && (
            <p className="auth-message">Use the HTTPS Vercel deployment and enable a screen lock, fingerprint, or other passkey authenticator on this device.</p>
          )}
          <button className="auth-tab" onClick={() => setAuthView("forgot-password")}>Forgot password?</button>
        </>
      )}

      <button className="guest-btn" onClick={loginAsGuest}>Continue as Guest</button>
    </div>
  );
}
