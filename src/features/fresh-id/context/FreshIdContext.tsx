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
import type { User } from "@supabase/supabase-js";

import { supabase } from "../../../lib/supabase";
import type { FreshUser, LinkedAccount } from "../types/user";

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
    linkedAccounts: [] as LinkedAccount[],
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

function passkeyErrorMessage(error: { message?: string; code?: string } | null, action: "sign-in" | "register") {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const normalized = `${code} ${message}`.toLowerCase();

  if (normalized.includes("passkey_disabled")) {
    return "Fresh ID biometric sign-in is not enabled for this deployment yet. Enable Passkeys in the Supabase Authentication settings, then try again.";
  }
  if (normalized.includes("not supported") || normalized.includes("webauthn") && normalized.includes("support")) {
    return "This browser or device does not support passkey authentication. Try a current HTTPS browser with a screen lock or biometric authenticator enabled.";
  }
  if (normalized.includes("credential_not_found")) {
    return "No registered Fresh ID passkey was found on this device. Sign in with your password first, then enable biometric sign-in from your account security panel.";
  }
  if (normalized.includes("credential_exists")) {
    return "This device is already registered for Fresh ID biometric sign-in.";
  }
  if (normalized.includes("origin") || normalized.includes("rp_id") || normalized.includes("relying party")) {
    return "The biometric security configuration does not match this website's domain. Check the Supabase WebAuthn relying-party ID and allowed origins.";
  }
  if (normalized.includes("cancel") || normalized.includes("abort")) {
    return action === "register"
      ? "Biometric registration was cancelled. No credential was added."
      : "Biometric sign-in was cancelled.";
  }
  return message || (action === "register"
    ? "Could not register this device for Fresh ID biometric sign-in."
    : "Biometric sign-in failed. Please try again.");
}

interface FreshIdContextValue {
  user: FreshUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
  message: string | null;
  authView: AuthView;
  passkeySupported: boolean;
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
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    const supported =
      window.isSecureContext &&
      typeof window.PublicKeyCredential !== "undefined" &&
      typeof navigator.credentials?.create === "function" &&
      typeof navigator.credentials?.get === "function";
    setPasskeySupported(supported);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setAuthView("reset-password");
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await loadUserProfile(data.session.user);
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
        await loadUserProfile(session.user);
      } else if (!isGuest) {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function provisionUserProfile(authUser: User): Promise<boolean> {
    const defaults = defaultUserFields();
    const email = authUser.email ?? "";
    const metadata = authUser.user_metadata ?? {};
    const baseUsername = String(metadata.user_name ?? metadata.preferred_username ?? email.split("@")[0] ?? "user")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "user";
    const username = `${baseUsername}_${authUser.id.slice(0, 8)}`;
    const fullName = String(metadata.full_name ?? metadata.name ?? baseUsername);
    const googleIdentity = authUser.identities?.find((identity) => identity.provider === "google");
    const provider = authUser.app_metadata?.provider;
    const linkedAccounts: LinkedAccount[] = provider === "google"
      ? [{
          provider: "google",
          providerId: googleIdentity?.id ?? authUser.id,
          linkedAt: new Date().toISOString(),
        }]
      : defaults.linkedAccounts;

    const { error: insertError } = await supabase.from("users").insert({
      id: authUser.id,
      username,
      email,
      full_name: fullName,
      role: "user",
      verified: Boolean(authUser.email_confirmed_at),
      presence: "online",
      identity: defaults.identity,
      preferences: defaults.preferences,
      stats: defaults.stats,
      security: defaults.security,
      subscription: defaults.subscription,
      linked_accounts: linkedAccounts,
    });

    if (insertError) {
      setError("Your sign-in succeeded, but Fresh ID could not create your profile. Please contact support.");
      return false;
    }

    return true;
  }

  async function loadUserProfile(authUser: User) {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (fetchError) {
      setError("Something went wrong loading your profile. Please try again.");
      setLoading(false);
      return;
    }

    if (!data) {
      const created = await provisionUserProfile(authUser);
      if (!created) {
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const { data: createdProfile, error: createdFetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (createdFetchError || !createdProfile) {
        setError("Your account was authenticated, but your Fresh ID profile is not available yet.");
        setLoading(false);
        return;
      }

      setUser(dbRowToFreshUser(createdProfile as Record<string, unknown>));
      setIsGuest(false);
      setError(null);
      setMessage("Your Fresh ID account is connected.");
      setLoading(false);
      return;
    }

    const currentUser = dbRowToFreshUser(data as Record<string, unknown>);
    const provider = authUser.app_metadata?.provider;
    if (provider === "google") {
      const googleIdentity = authUser.identities?.find((identity) => identity.provider === "google");
      const linked = currentUser.linkedAccounts ?? [];
      const alreadyLinked = linked.some((account) => account.provider === "google");
      if (!alreadyLinked) {
        const nextLinkedAccounts: LinkedAccount[] = [
          ...linked,
          {
            provider: "google",
            providerId: googleIdentity?.id ?? authUser.id,
            linkedAt: new Date().toISOString(),
          },
        ];
        const { error: linkError } = await supabase
          .from("users")
          .update({ linked_accounts: nextLinkedAccounts })
          .eq("id", authUser.id);
        if (!linkError) currentUser.linkedAccounts = nextLinkedAccounts;
      }
    }

    setUser(currentUser);
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

    await loadUserProfile(data.user);
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

    await loadUserProfile(data.user);
  }

  async function loginWithPasskey() {
    setError(null);
    setMessage(null);

    if (!passkeySupported) {
      setError("Biometric sign-in is unavailable here. Use HTTPS (or localhost) and a browser/device that supports passkeys.");
      return;
    }

    setLoading(true);
    const { data, error: passkeyError } = await supabase.auth.signInWithPasskey();

    if (passkeyError || !data.user) {
      setError(passkeyErrorMessage(passkeyError, "sign-in"));
      setLoading(false);
      return;
    }

    await loadUserProfile(data.user);
  }

  async function registerPasskey(): Promise<Passkey | null> {
    setError(null);
    setMessage(null);

    if (!user || isGuest) {
      setError("Sign in with your Fresh ID account before registering a biometric passkey.");
      return null;
    }

    if (!passkeySupported) {
      setError("Biometric setup is unavailable here. Use the deployed HTTPS Fresh Web Lite site or localhost with a supported browser/device.");
      return null;
    }

    setLoading(true);
    const { data, error: passkeyError } = await supabase.auth.registerPasskey();
    setLoading(false);

    if (passkeyError || !data) {
      setError(passkeyErrorMessage(passkeyError, "register"));
      return null;
    }

    setMessage("This device is now registered for Fresh ID biometric sign-in.");
    return data as Passkey;
  }

  async function listPasskeys(): Promise<Passkey[]> {
    if (!user || isGuest) return [];
    const { data, error: passkeyError } = await supabase.auth.passkey.list();
    if (passkeyError) {
      setError(passkeyErrorMessage(passkeyError, "register"));
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
    <FreshIdContext.Provider value={{ user, isAuthenticated: user !== null, isGuest, loading, error, message, authView, passkeySupported, setAuthView, register, login, loginWithPasskey, registerPasskey, listPasskeys, removePasskey, loginAsGuest, logout, updateUser, requestPasswordReset, updatePassword }}>
      {children}
    </FreshIdContext.Provider>
  );
}

export function useFreshId() {
  const context = useContext(FreshIdContext);
  if (!context) throw new Error("useFreshId must be used inside FreshIdProvider");
  return context;
}
