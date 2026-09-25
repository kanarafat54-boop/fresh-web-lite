import { useContext, useEffect, useState, type ReactNode } from "react";
import { contextService, type FreshContext } from "../../core/fresh-core";
import { FreshCoreContext } from "./FreshCoreContext";

export function FreshCoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [context, setContext] = useState<FreshContext | null>(() => contextService.get());

  useEffect(() => {
    const nextContext: FreshContext = {
      userId: "guest",
      activeSpace: "ai",
      goals: [],
      interests: [],
      skills: [],
      projects: [],
      device: {
        platform: navigator.platform,
        type: "web",
      },
      timestamp: new Date().toISOString(),
    };

    contextService.initialize(nextContext);
    setContext(nextContext);
    setReady(true);
  }, []);

  return (
    <FreshCoreContext.Provider
      value={{
        ready,
        context,
      }}
    >
      {children}
    </FreshCoreContext.Provider>
  );
}

export function useFreshCore() {
  const value = useContext(FreshCoreContext);

  if (!value) {
    throw new Error("useFreshCore must be used inside FreshCoreProvider");
  }

  return value;
}
