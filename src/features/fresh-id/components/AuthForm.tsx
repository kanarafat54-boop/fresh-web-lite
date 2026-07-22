/**
 * Fresh Web Lite
 * Fresh ID Auth Form
 */

import { useState } from "react";
import { useFreshId } from "../context/FreshIdContext";

export function AuthForm() {
  const {
    register,
    login,
    loginAsGuest,
    loading,
    error,
    message,
    authView,
    setAuthView,
    requestPasswordReset,
    updatePassword,
  } = useFreshId();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function handleSubmit() {
    if (mode === "login") {
      login(email, password);
    } else {
      register(email, password, username, fullName);
    }
  }

  if (authView === "check-email") {
    return (
      <div className="auth-form">
        <p className="auth-message">{message}</p>
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
        <input
          className="auth-input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-message">{message}</p>}
        <button
          className="auth-submit-btn"
          onClick={() => requestPasswordReset(email)}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        <button className="auth-tab" onClick={() => setAuthView("form")}>
          Back to Log In
        </button>
      </div>
    );
  }

  if (authView === "reset-password") {
    return (
      <div className="auth-form">
        <h3>Choose a new password</h3>
        <input
          className="auth-input"
          placeholder="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-message">{message}</p>}
        <button
          className="auth-submit-btn"
          onClick={() => updatePassword(newPassword)}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="auth-tabs">
        <button
          className={mode === "login" ? "auth-tab active" : "auth-tab"}
          onClick={() => setMode("login")}
        >
          Log In
        </button>
        <button
          className={mode === "register" ? "auth-tab active" : "auth-tab"}
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>

      {mode === "register" && (
        <>
          <input
            className="auth-input"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </>
      )}

      <input
        className="auth-input"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="auth-input"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-message">{message}</p>}

      <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
      </button>

      {mode === "login" && (
        <button
          className="auth-tab"
          onClick={() => setAuthView("forgot-password")}
        >
          Forgot password?
        </button>
      )}

      <button className="guest-btn" onClick={loginAsGuest}>
        Continue as Guest
      </button>
    </div>
  );
}
