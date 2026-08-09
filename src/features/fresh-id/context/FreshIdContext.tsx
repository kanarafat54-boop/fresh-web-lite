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

type Passkey = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

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

function dbRowToFreshUser(row: Record<string, unknown>): FreshUser {
  return {
    id: String(row.id),
    username: String(row.username ?? ""),
    email: String(row.email ?? ""),
    fullName: String(row.full_name ?? ""),
    role: String(row.role ?? "user") as FreshUser["role"],
    verified: Boolean(row.verified),
    presence: String(row.presence ?? "offline") as FreshUser["presence"],
    identity: row.identity ?? {},
    preferences: row.preferences as FreshUser["preferences"],
    stats: row.stats as FreshUser["stats"],
    security: row.security as FreshUser["security"],
    subscription: row.subscription as FreshUser["subscription"],
    linkedAccounts: (row.linked_accounts ?? []) as FreshUser["linkedAccounts"],
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
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
  loginWithPasskey: () => Promise<void>;
  registerPasskey: () => Promise<Passkey | null>;
  listPasskeys: () => Promise<Passkey[]>;
  removePasskey: (passkeyId: string) => Promise<void>;
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

    setUser(dbRowToFreshUser(data as Record<string, unknown>));
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
      options: { emailRedirectTo: window.location.origin },
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
      setError(insertError.code === "23505" ? "That username or email is already taken." : "Registration failed while creating your profile. Please try again.");
      setLoading(false);
      return;
    }

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
      setError(signInError?.message.toLowerCase().includes("email not confirmed") ? "Please confirm your email before logging in. Check your inbox for the link." : "Incorrect email or password.");
      setLoading(false);
      return;
    }

    await loadUserProfile(data.user.id);
  }

  async function loginWithPasskey() {
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!window.isSecureContext) {
      setError("Biometric sign-in requires HTTPS. Use the deployed Fresh Web Lite site or localhost.");
      setLoading(false);
      return;
    }

    const { data, error: passkeyError } = await supabase.auth.signInWithPasskey();
    if (passkeyError || !data.user) {
      setError(passkeyError?.message ?? "Biometric sign-in failed or was cancelled.");
      setLoading(false);
      return;
    }

    await loadUserProfile(data.user.id);
  }

  async function registerPasskey(): Promise<Passkey | null> {
    setError(null);
    setMessage(null);

    if (!user || isGuest) {
      setError("Sign in with your Fresh ID account before registering a biometric passkey.");
      return null;
    }

    if (!window.isSecureContext) {
      setError("Biometric setup requires HTTPS. Use the deployed Fresh Web Lite site or localhost.");
      return null;
    }

    setLoading(true);
    const { data, error: passkeyError } = await supabase.auth.registerPasskey();
    setLoading(false);

    if (passkeyError || !data) {
      setError(passkeyError?.message ?? "Could not register this device for biometric sign-in.");
      return null;
    }

    setMessage("This device is now registered for Fresh ID biometric sign-in.");
    return data as Passkey;
  }

  async function listPasskeys(): Promise<Passkey[]> {
    if (!user || isGuest) return [];
    const { data, error: passkeyError } = await supabase.auth.passkey.list();
    if (passkeyError) {
      setError(passkeyError.message);
      return [];
    }
    return (data ?? []) as Passkey[];
  }

  async function removePasskey(passkeyId: string) {
    if (!user || isGuest) return;
    const { error: passkeyError } = await supabase.auth.passkey.delete({ passkeyId });
    if (passkeyError) {
      setError(passkeyError.message);
      return;
    }
    setMessage("Biometric sign-in credential removed from this account.");
  }

  function loginAsGuest() {
    setError(null);
    setMessage(null);
    setUser(createMockUser());
    setIsGuest(true);
  }

  async function logout() {
    if (!isGuest) await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    setError(null);
    setMessage(null);
    setAuthView("form");
  }

  function updateUser(patch: Partial<FreshUser>) {
    setUser((previous) => previous ? { ...previous, ...patch, updatedAt: new Date().toISOString() } : previous);
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
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
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
    <FreshIdContext.Provider value={{ user, isAuthenticated: user !== null, isGuest, loading, error, message, authView, setAuthView, register, login, loginWithPasskey, registerPasskey, listPasskeys, removePasskey, loginAsGuest, logout, updateUser, requestPasswordReset, updatePassword }}>
      {children}
    </FreshIdContext.Provider>
  );
}

export function useFreshId() {
  const context = useContext(FreshIdContext);
  if (!context) throw new Error("useFreshId must be used inside FreshIdProvider");
  return context;
}
