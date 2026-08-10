/**
 * Fresh Web Lite
 * Fresh ID Auth Form
 */

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../context/FreshIdContext";

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
    passkeySupported,
  } = useFreshId();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setGoogleError(null);
    setGoogleLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setGoogleError(oauthError.message);
      setGoogleLoading(false);
    }
  }

  async function handleRegister() {
    setSignupError(null);

    if (!email.trim() || !password || !username.trim() || !fullName.trim()) {
      setSignupError("Please fill in your full name, username, email, and password.");
      return;
    }

    if (password.length < 6) {
      setSignupError("Your password must contain at least 6 characters.");
      return;
    }

    setSignupLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          user_name: username.trim(),
          preferred_username: username.trim(),
        },
      },
    });

    if (signUpError) {
      setSignupError(signUpError.message);
      setSignupLoading(false);
      return;
    }

    if (!data.user) {
      setSignupError("Supabase did not return a user account. Please try again.");
      setSignupLoading(false);
      return;
    }

    // Profile creation is deliberately deferred to FreshIdProvider.
    // This is important when Supabase email confirmation is enabled: signup
    // returns a user but no authenticated session, so the browser must not
    // attempt an RLS-protected public.users insert as an anonymous user.
    if (!data.session) {
      setAuthView("check-email");
      setSignupLoading(false);
      return;
    }

    setSignupLoading(false);
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
      {message && <p className="auth-message">{message}</p>}
      {googleError && <p className="auth-error">Google sign-in: {googleError}</p>}

      <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading || googleLoading || signupLoading}>
        {signupLoading ? "Creating account..." : loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
      </button>

      {mode === "login" && (
        <>
          <button
            className="auth-submit-btn google-auth-btn"
            onClick={() => void handleGoogleSignIn()}
            disabled={loading || googleLoading}
          >
            {googleLoading ? "Connecting to Google..." : "Continue with Google"}
          </button>

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
