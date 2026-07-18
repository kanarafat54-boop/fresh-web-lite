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

import AppConfig from "../../../config/app.config";
import type { FreshUser } from "../types/user";


function createMockUser(): FreshUser {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),

    username: "guest",

    email: "guest@fresh.app",

    fullName: "Guest User",

    role: "user",

    verified: false,

    presence: "online",

    identity: {},

    preferences: {
      theme: "system",
      language: "en",
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone,
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
      tier: "free",
      isTrial: false,
    },

    linkedAccounts: [],

    createdAt: now,

    updatedAt: now,
  };
}


interface FreshIdContextValue {
  user: FreshUser | null;

  isAuthenticated: boolean;

  login: (user: FreshUser) => void;

  loginAsGuest: () => void;

  logout: () => void;

  updateUser: (patch: Partial<FreshUser>) => void;
}


const FreshIdContext =
  createContext<FreshIdContextValue | undefined>(undefined);



export function FreshIdProvider({
  children,
}: {
  children: ReactNode;
}) {

  const storageKey =
    AppConfig.auth.tokenStorageKey;


  const [user, setUser] =
    useState<FreshUser | null>(() => {

      const saved =
        localStorage.getItem(storageKey);

      return saved
        ? (JSON.parse(saved) as FreshUser)
        : null;

    });


  useEffect(() => {

    if (user) {

      localStorage.setItem(
        storageKey,
        JSON.stringify(user)
      );

    } else {

      localStorage.removeItem(storageKey);

    }

  }, [user, storageKey]);



  function login(newUser: FreshUser) {

    setUser({
      ...newUser,
      updatedAt:
        new Date().toISOString(),
    });

  }



  function loginAsGuest() {

    setUser(createMockUser());

  }



  function logout() {

    setUser(null);

  }



  function updateUser(
    patch: Partial<FreshUser>
  ) {

    setUser((previous) => {

      if (!previous) return previous;

      return {
        ...previous,
        ...patch,
        updatedAt:
          new Date().toISOString(),
      };

    });

  }



  return (
    <FreshIdContext.Provider
      value={{
        user,
        isAuthenticated:
          user !== null,
        login,
        loginAsGuest,
        logout,
        updateUser,
      }}
    >
      {children}
    </FreshIdContext.Provider>
  );

}



export function useFreshId() {

  const context =
    useContext(FreshIdContext);


  if (!context) {

    throw new Error(
      "useFreshId must be used inside FreshIdProvider"
    );

  }


  return context;

}
