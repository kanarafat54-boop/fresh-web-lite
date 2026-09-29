import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { saveFreshContext, recordFreshFlowEvents } from "./freshPlatformRuntime";

export default function FreshPlatformRuntimeBoundary({ route, children }: { route: string; children: React.ReactNode }) {
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      void saveFreshContext({
        userId: data.user.id,
        route,
        context: { surface: route, lastSeenAt: new Date().toISOString() },
      });
      void recordFreshFlowEvents([{
        userId: data.user.id,
        eventType: "ecosystem.entered",
        metadata: { route },
      }]);
    });
    return () => { active = false; };
  }, [route]);

  return <>{children}</>;
}
