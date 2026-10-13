/**
 * Fresh Web Lite
 * Fresh ID Auth Form
 */

import { useState } from "react";
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

  const initialMode = typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/auth/sign-up" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  async function handleSocialSignIn(provider: "google" | "apple" | "facebook" | "x" | "instagram") {
    setSocialError(null);
    if (provider === "instagram") {
      setSocialError("Instagram sign-in is not connected to this Fresh ID project yet. Use email or another enabled provider for now.");
      return;
    }
    setSocialLoading(provider);
    const oauthProvider = provider === "x" ? "twitter" : provider;
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo: window.location.origin,
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
    { id: "facebook" as const, label: "Facebook", symbol: "f", className: "facebook", title: "Continue with Facebook" },
    { id: "x" as const, label: "X", symbol: "𝕏", className: "x", title: "Continue with X" },
    { id: "instagram" as const, label: "Instagram", symbol: "◎", className: "instagram", title: "Continue with Instagram" },
  ];

  async function handleRegister() {
    setSignupError(null);

    if (!policyAccepted) {
      setSignupError("Please review and accept the Privacy and Policy sections before creating your Fresh ID.");
      return;
    }

    await register(email.trim(), password, username.trim(), fullName.trim());
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
        <label className="auth-field"><span className="auth-field-label">New password</span><input className="auth-input" name="new-password" autoComplete="new-password" aria-label="New password" placeholder="Choose a new password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} /></label>
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
          <label className="auth-field"><span className="auth-field-label">Full name</span><input className="auth-input" name="name" autoComplete="name" aria-label="Full name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
          <label className="auth-field"><span className="auth-field-label">Username</span><input className="auth-input" name="username" autoComplete="username" aria-label="Username" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        </>
      )}

      <label className="auth-field"><span className="auth-field-label">Email address</span><input className="auth-input" name="email" autoComplete="email" aria-label="Email address" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="auth-field"><span className="auth-field-label">Password</span><input className="auth-input" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} aria-label="Password" placeholder={mode === "login" ? "Enter your password" : "Create a password"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : undefined} /></label>

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
                  ) : provider.id === "facebook" ? (
                    <svg viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.875 11.85v-8.38H7.08V12h3.045V9.35c0-3.005 1.79-4.665 4.53-4.665 1.312 0 2.685.234 2.685.234v2.95h-1.512c-1.49 0-1.955.925-1.955 1.874V12h3.325l-.532 3.47h-2.793v8.38A12.002 12.002 0 0 0 24 12Z"/></svg>
                  ) : provider.id === "x" ? (
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.62L5.38 22H2.25l7.25-8.29L1.8 2h6.4l4.43 6.96L18.9 2Zm-1.1 17.9h1.73L7.27 4H5.42l12.38 15.9Z"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><defs><linearGradient id="fresh-instagram-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#FFDC80"/><stop offset="45%" stopColor="#F77737"/><stop offset="72%" stopColor="#E1306C"/><stop offset="100%" stopColor="#833AB4"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="url(#fresh-instagram-gradient)" strokeWidth="2.2"/><circle cx="12" cy="12" r="4" fill="none" stroke="url(#fresh-instagram-gradient)" strokeWidth="2.2"/><circle cx="17.5" cy="6.7" r="1.25" fill="#E1306C"/></svg>
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
