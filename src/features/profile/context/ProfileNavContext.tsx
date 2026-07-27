/**
 * Fresh Web Lite
 * Lightweight context so any component can open a user's profile view
 */

import { createContext, useContext, useState, type ReactNode } from "react";

interface ProfileNavValue {
  viewingUserId: string | null;
  openProfile: (userId: string) => void;
  closeProfile: () => void;
}

const ProfileNavContext = createContext<ProfileNavValue | undefined>(undefined);

export function ProfileNavProvider({ children }: { children: ReactNode }) {
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  return (
    <ProfileNavContext.Provider
      value={{
        viewingUserId,
        openProfile: (userId: string) => setViewingUserId(userId),
        closeProfile: () => setViewingUserId(null),
      }}
    >
      {children}
    </ProfileNavContext.Provider>
  );
}

export function useProfileNav() {
  const ctx = useContext(ProfileNavContext);
  if (!ctx) throw new Error("useProfileNav must be used within ProfileNavProvider");
  return ctx;
}
