import { useEffect, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { saveFreshContext } from "./freshPlatformRuntime";

export default function FreshPlatformRuntimeBoundary({ route, children }: { route: string; children: ReactNode }) {
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const userId = data.user.id;
      void saveFreshContext({
        userId,
        world: route,
        context: { surface: route, lastSeenAt: new Date().toISOString() },
      });
    });
    return () => { active = false; };
  }, [route]);

  return <>{children}</>;
}
