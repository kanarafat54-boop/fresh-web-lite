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

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  async function handleSocialSignIn(provider: "google" | "apple" | "facebook" | "x") {
    setSocialError(null);
    setSocialLoading(provider);
    const oauthProvider = provider === "x" ? "twitter" : provider;
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
  }

  const socialProviders = [
    { id: "google" as const, label: "Google", symbol: "G", className: "google", title: "Continue with Google" },
    { id: "apple" as const, label: "Apple", symbol: "●", className: "apple", title: "Continue with Apple" },
    { id: "facebook" as const, label: "Facebook", symbol: "f", className: "facebook", title: "Continue with Facebook" },
    { id: "x" as const, label: "X", symbol: "𝕏", className: "x", title: "Continue with X" },
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
        <input className="auth-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
        <input className="auth-input" placeholder="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
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
      <div className="auth-tabs">
        <button className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("login"); setSignupError(null); }}>Log In</button>
        <button className={mode === "register" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("register"); setSignupError(null); }}>Register</button>
      </div>

      {mode === "register" && (
        <>
          <input className="auth-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="auth-input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </>
      )}

      <input className="auth-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="auth-input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

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

      <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading || socialLoading}>
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
                <span className="auth-social-symbol" aria-hidden="true">{provider.symbol}</span>
                <span className="sr-only">{provider.label}</span>
              </button>
            ))}
          </div>

          <button
            className="auth-submit-btn"
            onClick={() => void loginWithPasskey()}
            disabled={loading || googleLoading || !passkeySupported}
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
