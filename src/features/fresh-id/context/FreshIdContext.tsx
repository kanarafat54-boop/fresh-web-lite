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
type EditableProfilePatch = Pick<Partial<FreshUser>, "fullName" | "username" | "preferences">;

export type FreshSessionState = {
  expiresAt: number | null;
  lastRefreshedAt: string | null;
  accessLevel: "signed-out" | "authenticated" | "guest";
};

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
  return action === "register"
    ? "Could not register this device for Fresh ID biometric sign-in. Please try again."
    : "Biometric sign-in failed. Please try again.";
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
  register: (email: string, password: string, username: string, fullName: string, profile: { dateOfBirth: string; country: string; gender: string; consentVersion: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithPasskey: () => Promise<void>;
  registerPasskey: () => Promise<Passkey | null>;
  listPasskeys: () => Promise<Passkey[]>;
  removePasskey: (passkeyId: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  updateUser: (patch: EditableProfilePatch) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  session: FreshSessionState;
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
  const [session, setSession] = useState<FreshSessionState>({ expiresAt: null, lastRefreshedAt: null, accessLevel: "signed-out" });

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
        setSession({ expiresAt: data.session.expires_at ?? null, lastRefreshedAt: new Date().toISOString(), accessLevel: "authenticated" });
        await loadUserProfile(data.session.user);
      } else {
        setSession({ expiresAt: null, lastRefreshedAt: new Date().toISOString(), accessLevel: "signed-out" });
        setLoading(false);
      }
    }).catch(() => {
      setError("We couldn't restore your Fresh ID session. Check your connection and reload the page.");
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthView("reset-password");
        setLoading(false);
        return;
      }
      if (session?.user) {
        setSession({ expiresAt: session.expires_at ?? null, lastRefreshedAt: new Date().toISOString(), accessLevel: "authenticated" });
        await loadUserProfile(session.user);
      } else if (!isGuest) {
        setSession({ expiresAt: null, lastRefreshedAt: new Date().toISOString(), accessLevel: "signed-out" });
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function persistPrivateSignupProfile(authUser: User): Promise<boolean> {
    const metadata = authUser.user_metadata ?? {};
    if (typeof metadata.date_of_birth !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(metadata.date_of_birth)) return true;

    const privateFields = {
      country: typeof metadata.country === "string" ? metadata.country : null,
      gender: typeof metadata.gender === "string" ? metadata.gender : null,
      updated_at: new Date().toISOString(),
    };
    const { data: existing, error: lookupError } = await supabase
      .from("fresh_id_private_profiles")
      .select("user_id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (lookupError) {
      setError("We couldn't verify your private signup profile. Please try again.");
      return false;
    }

    const saveResult = existing
      ? await supabase.from("fresh_id_private_profiles").update(privateFields).eq("user_id", authUser.id)
      : await supabase.from("fresh_id_private_profiles").insert({
          user_id: authUser.id,
          date_of_birth: metadata.date_of_birth,
          ...privateFields,
          signup_consent_version: typeof metadata.signup_consent_version === "string" ? metadata.signup_consent_version : null,
        });

    if (saveResult.error) {
      setError("Your account was created, but your private signup details could not be saved. Please retry after signing in.");
      return false;
    }
    return true;
  }

  async function clearTemporarySignupMetadata(authUser: User) {
    if (typeof authUser.user_metadata?.date_of_birth !== "string") return;
    const { data: privateProfile, error: privateProfileError } = await supabase
      .from("fresh_id_private_profiles")
      .select("user_id")
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (privateProfileError || !privateProfile) return;

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        date_of_birth: null,
        country: null,
        gender: null,
        signup_consent_version: null,
        signup_consent_at: null,
      },
    });
    if (metadataError) {
      setMessage("Your private signup details are saved, but temporary account metadata could not be cleared yet.");
    }
  }

  async function provisionUserProfile(authUser: User): Promise<boolean> {
    const defaults = defaultUserFields();
    const email = authUser.email ?? "";
    const metadata = authUser.user_metadata ?? {};
    const baseUsername = String(metadata.username ?? metadata.user_name ?? metadata.preferred_username ?? email.split("@")[0] ?? "user")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "user";
    const username = String(metadata.username ?? `${baseUsername}_${authUser.id.slice(0, 8)}`).toLowerCase();
    const fullName = String(metadata.full_name ?? metadata.name ?? baseUsername);

    const { error: insertError } = await supabase.from("users").insert({
      id: authUser.id,
      username,
      email,
      full_name: fullName,
      preferences: defaults.preferences,
    });

    if (insertError) {
      // Auth callbacks can race with the initial profile load. A duplicate
      // primary key means the other callback already provisioned this profile.
      if (insertError.code === "23505") {
        const { data: existing } = await supabase.from("users").select("id").eq("id", authUser.id).maybeSingle();
        if (existing) return persistPrivateSignupProfile(authUser);
      }
      setError(insertError.code === "23505" ? "That username is already taken. Choose another username and try again." : "Your sign-in succeeded, but Fresh ID could not create your profile. Please try again.");
      return false;
    }

    return persistPrivateSignupProfile(authUser);
  }

  async function loadUserProfile(authUser: User) {
    setLoading(true);
    try {
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

      const privateProfile = await supabase.from("fresh_id_private_profiles").select("date_of_birth,country,gender").eq("user_id", authUser.id).maybeSingle();
      setUser({ ...dbRowToFreshUser(createdProfile as Record<string, unknown>), dateOfBirth: privateProfile.data?.date_of_birth ? String(privateProfile.data.date_of_birth) : undefined, country: privateProfile.data?.country ? String(privateProfile.data.country) : undefined, gender: privateProfile.data?.gender ? String(privateProfile.data.gender) : undefined });
      setIsGuest(false);
      setError(null);
      setMessage("Your Fresh ID account is connected.");
      setLoading(false);
      return;
    }

    const privateSaved = await persistPrivateSignupProfile(authUser);
    if (!privateSaved) {
      setLoading(false);
      return;
    }
    const currentUser = dbRowToFreshUser(data as Record<string, unknown>);
    const privateProfile = await supabase.from("fresh_id_private_profiles").select("date_of_birth,country,gender").eq("user_id", authUser.id).maybeSingle();

    setUser({ ...currentUser, dateOfBirth: privateProfile.data?.date_of_birth ? String(privateProfile.data.date_of_birth) : undefined, country: privateProfile.data?.country ? String(privateProfile.data.country) : undefined, gender: privateProfile.data?.gender ? String(privateProfile.data.gender) : undefined });
    setIsGuest(false);
    setError(null);
    setLoading(false);
    } catch {
      setError("We couldn't finish loading your Fresh ID profile. Check your connection and try again.");
      setLoading(false);
    }
  }
  async function register(email: string, password: string, username: string, fullName: string, profile: { dateOfBirth: string; country: string; gender: string; consentVersion: string }) {
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!email || !password || !username || !fullName || !profile?.dateOfBirth) {
      setError("Please complete all required Fresh ID fields.");
      setLoading(false);
      return;
    }

    const birthDate = new Date(`${profile.dateOfBirth}T00:00:00.000Z`);
    const ageCutoff = new Date();
    ageCutoff.setUTCFullYear(ageCutoff.getUTCFullYear() - 13);
    if (
      password.length < 12 ||
      !/^[a-z0-9_]{3,24}$/.test(username) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth) ||
      Number.isNaN(birthDate.getTime()) ||
      birthDate.toISOString().slice(0, 10) !== profile.dateOfBirth ||
      birthDate > ageCutoff
    ) {
      setError("Check your username, date of birth, minimum age, and password requirements.");
      setLoading(false);
      return;
    }

    let data: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"];
    let signUpError: Awaited<ReturnType<typeof supabase.auth.signUp>>["error"];
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: new URL("/auth/sign-in", window.location.origin).toString(),
          data: { username, full_name: fullName, date_of_birth: profile.dateOfBirth, country: profile.country || null, gender: profile.gender || null, signup_consent_version: profile.consentVersion, signup_consent_at: new Date().toISOString() },
        },
      });
      data = result.data;
      signUpError = result.error;
    } catch {
      setError("We couldn't reach the account service. Check your connection and try again.");
      setLoading(false);
      return;
    }

    if (signUpError || !data?.user) {
      setError("Fresh ID couldn't create your account. Check the details and try again.");
      setLoading(false);
      return;
    }

    // Email confirmation can leave the client without an authenticated session.
    // Do not write to the protected users table until the user has confirmed and
    // Fresh ID has an authenticated Supabase session. loadUserProfile() will
    // provision the profile from auth metadata after confirmation/sign-in.
    if (!data.session) {
      setMessage(`We sent a confirmation link to ${email}. Please check your inbox to activate your account.`);
      setAuthView("check-email");
      setLoading(false);
      return;
    }

    await loadUserProfile(data.user);
    await clearTemporarySignupMetadata(data.user);
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

    let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"];
    let signInError: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"];
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      data = result.data;
      signInError = result.error;
    } catch {
      setError("We couldn't reach the sign-in service. Check your connection and try again.");
      setLoading(false);
      return;
    }

    if (signInError || !data.user) {
      setError(signInError?.message.toLowerCase().includes("email not confirmed") ? "Please confirm your email before logging in. Check your inbox for the link." : "Incorrect email or password.");
      setLoading(false);
      return;
    }

    await loadUserProfile(data.user);
    await clearTemporarySignupMetadata(data.user.id);
  }

  async function loginWithPasskey() {
    setError(null);
    setMessage(null);

    if (!passkeySupported) {
      setError("Biometric sign-in is unavailable here. Use HTTPS (or localhost) and a browser/device that supports passkeys.");
      return;
    }

    setLoading(true);
    let data: Awaited<ReturnType<typeof supabase.auth.signInWithPasskey>>["data"];
    let passkeyError: Awaited<ReturnType<typeof supabase.auth.signInWithPasskey>>["error"];
    try {
      const result = await supabase.auth.signInWithPasskey();
      data = result.data;
      passkeyError = result.error;
    } catch {
      setError("Biometric sign-in couldn't reach the account service. Check your connection and try again.");
      setLoading(false);
      return;
    }

    if (passkeyError || !data?.user) {
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
    try {
      const { data, error: passkeyError } = await supabase.auth.registerPasskey();
      if (passkeyError || !data) {
        setError(passkeyErrorMessage(passkeyError, "register"));
        return null;
      }

      setMessage("This device is now registered for Fresh ID biometric sign-in.");
      return data as Passkey;
    } catch {
      setError("Fresh ID couldn't register this device for biometric sign-in. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function listPasskeys(): Promise<Passkey[]> {
    if (!user || isGuest) return [];
    try {
      const { data, error: passkeyError } = await supabase.auth.passkey.list();
      if (passkeyError) {
        setError(passkeyErrorMessage(passkeyError, "register"));
        return [];
      }
      return (data ?? []) as Passkey[];
    } catch {
      setError("Fresh ID couldn't load your biometric sign-in devices. Please try again.");
      return [];
    }
  }

  async function removePasskey(passkeyId: string) {
    if (!user || isGuest) return;
    try {
      const { error: passkeyError } = await supabase.auth.passkey.delete({ passkeyId });
      if (passkeyError) {
        setError("Fresh ID couldn't remove that biometric sign-in device. Please try again.");
        return;
      }
      setMessage("Biometric sign-in credential removed from this account.");
    } catch {
      setError("Fresh ID couldn't remove that biometric sign-in device. Please try again.");
    }
  }

  function loginAsGuest() {
    setError(null);
    setMessage(null);
    setUser(createMockUser());
    setIsGuest(true);
    setSession({ expiresAt: null, lastRefreshedAt: new Date().toISOString(), accessLevel: "guest" });
  }

  async function logout() {
    if (!isGuest) await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    setSession({ expiresAt: null, lastRefreshedAt: new Date().toISOString(), accessLevel: "signed-out" });
    setError(null);
    setMessage(null);
    setAuthView("form");
  }

  async function updateUser(patch: EditableProfilePatch): Promise<boolean> {
    if (!user) return false;
    const updatedAt = new Date().toISOString();
    const nextUser: FreshUser = { ...user, ...patch, updatedAt };

    if (!isGuest) {
      const dbPatch: Record<string, unknown> = {};
      if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
      if (patch.username !== undefined) dbPatch.username = patch.username;
      if (patch.preferences !== undefined) dbPatch.preferences = patch.preferences;
      if (Object.keys(dbPatch).length > 0) {
        dbPatch.updated_at = updatedAt;
        try {
          const { error: saveError } = await supabase
            .from("users")
            .update(dbPatch)
            .eq("id", user.id);
          if (saveError) {
            setError("Your changes could not be saved. Check your connection and account permissions.");
            return false;
          }
        } catch {
          setError("Your changes could not be saved. Check your connection and try again.");
          return false;
        }
      }
    }

    setUser(nextUser);
    setError(null);
    setMessage(isGuest ? "Changes apply to this temporary guest session only." : "Your Fresh ID settings have been saved.");
    return true;
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
    let resetError: Awaited<ReturnType<typeof supabase.auth.resetPasswordForEmail>>["error"];
    try {
      const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: new URL("/auth/sign-in", window.location.origin).toString() });
      resetError = result.error;
    } catch {
      setError("We couldn't reach the password-reset service. Check your connection and try again.");
      setLoading(false);
      return;
    }
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
    if (!newPassword || newPassword.length < 12) {
      setError("Password must be at least 12 characters.");
      setLoading(false);
      return;
    }
    let updateError: Awaited<ReturnType<typeof supabase.auth.updateUser>>["error"];
    try {
      const result = await supabase.auth.updateUser({ password: newPassword });
      updateError = result.error;
    } catch {
      setError("We couldn't reach the password service. Check your connection and try again.");
      setLoading(false);
      return;
    }
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
    <FreshIdContext.Provider value={{ user, isAuthenticated: user !== null, isGuest, loading, error, message, authView, passkeySupported, session, setAuthView, register, login, loginWithPasskey, registerPasskey, listPasskeys, removePasskey, loginAsGuest, logout, updateUser, requestPasswordReset, updatePassword }}>
      {children}
    </FreshIdContext.Provider>
  );
}

export function useFreshId() {
  const context = useContext(FreshIdContext);
  if (!context) throw new Error("useFreshId must be used inside FreshIdProvider");
  return context;
}
