/**
 * Fresh Web Lite
 * Fresh ID Platform Context
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "../../../lib/supabase";
import type { FreshUser } from "../types/user";

function defaultUserFields() {
  const now = new Date().toISOString();
  return {
    identity: {},
    preferences: {
      theme: "system" as const,
      language: "en",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      emailNotifications: true,
      pushNotifications: true,
    },
    stats: {
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      reputationScore: 0,
    },
    security: {
      twoFactorEnabled: false,
    },
    subscription: {
      tier: "free" as const,
      isTrial: false,
    },
    linkedAccounts: [],
    createdAt: now,
    updatedAt: now,
  };
}

function dbRowToFreshUser(row: any): FreshUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    verified: row.verified,
    presence: row.presence,
    identity: row.identity ?? {},
    preferences: row.preferences,
    stats: row.stats,
    security: row.security,
    subscription: row.subscription,
    linkedAccounts: row.linked_accounts ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createMockUser(): FreshUser {
  const defaults = defaultUserFields();
  return {
    id: crypto.randomUUID(),
    username: "guest",
    email: "guest@fresh.app",
    fullName: "Guest User",
    role: "user",
    verified: false,
    presence: "online",
    ...defaults,
  };
}

type AuthView = "form" | "check-email" | "reset-password" | "forgot-password";

interface FreshIdContextValue {
  user: FreshUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
  message: string | null;
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  register: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<FreshUser>) => void;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const FreshIdContext = createContext<FreshIdContextValue | undefined>(undefined);

export function FreshIdProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FreshUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authView, setAuthView] = useState<AuthView>("form");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setAuthView("reset-password");
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await loadUserProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthView("reset-password");
        setLoading(false);
        return;
      }
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else if (!isGuest) {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadUserProfile(userId: string) {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      setError("Something went wrong loading your profile. Please try again.");
      setLoading(false);
      return;
    }

    if (!data) {
      setError("We couldn't find a profile for this account. Please contact support.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    setUser(dbRowToFreshUser(data));
    setIsGuest(false);
    setError(null);
    setLoading(false);
  }

  async function register(email: string, password: string, username: string, fullName: string) {
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!email || !password || !username || !fullName) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    const defaults = defaultUserFields();
    const { error: insertError } = await supabase.from("users").insert({
      id: data.user.id,
      username,
      email,
      full_name: fullName,
      role: "user",
      verified: false,
      presence: "online",
      identity: defaults.identity,
      preferences: defaults.preferences,
      stats: defaults.stats,
      security: defaults.security,
      subscription: defaults.subscription,
      linked_accounts: defaults.linkedAccounts,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("That username or email is already taken.");
      } else {
        setError("Registration failed while creating your profile. Please try again.");
      }
      setLoading(false);
      return;
    }

    // If Supabase returns no session, email confirmation is required
    if (!data.session) {
      setMessage(`We sent a confirmation link to ${email}. Please check your inbox to activate your account.`);
      setAuthView("check-email");
      setLoading(false);
      return;
    }

    await loadUserProfile(data.user.id);
  }

  async function login(email: string, password: string) {
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      if (signInError?.message.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email before logging in. Check your inbox for the link.");
      } else {
        setError("Incorrect email or password.");
      }
      setLoading(false);
      return;
    }

    await loadUserProfile(data.user.id);
  }

  function loginAsGuest() {
    setError(null);
    setMessage(null);
    setUser(createMockUser());
    setIsGuest(true);
  }

  async function logout() {
    if (!isGuest) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsGuest(false);
    setError(null);
    setMessage(null);
    setAuthView("form");
  }

  function updateUser(patch: Partial<FreshUser>) {
    setUser((previous) => {
      if (!previous) return previous;
      return { ...previous, ...patch, updatedAt: new Date().toISOString() };
    });
  }

  async function requestPasswordReset(email: string) {
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!email) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (resetError) {
      setError("Something went wrong sending the reset email. Please try again.");
      setLoading(false);
      return;
    }

    setMessage(`If an account exists for ${email}, a password reset link has been sent.`);
    setLoading(false);
  }

  async function updatePassword(newPassword: string) {
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError("Something went wrong updating your password. Please try again.");
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully. You can now log in.");
    setAuthView("form");
    await supabase.auth.signOut();
    setLoading(false);
  }

  return (
    <FreshIdContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isGuest,
        loading,
        error,
        message,
        authView,
        setAuthView,
        register,
        login,
        loginAsGuest,
        logout,
        updateUser,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </FreshIdContext.Provider>
  );
}

export function useFreshId() {
  const context = useContext(FreshIdContext);
  if (!context) {
    throw new Error("useFreshId must be used inside FreshIdProvider");
  }
  return context;
}
