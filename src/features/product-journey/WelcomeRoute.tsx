import { useEffect } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import { markWelcomeSeen } from "./productJourney";
import WelcomePage from "./WelcomePage";

/**
 * Mockup panel 1 → 2
 * Get Started → Sign Up surface
 * Sign In → Sign In surface
 */
export default function WelcomeRoute() {
  const { setActiveRoute } = useLayout();
  useEffect(() => {
    // Reaching the welcome surface counts as seeing it; this prevents the
    // cold-start guard from reopening Welcome after the user chooses auth.
    markWelcomeSeen();
  }, []);
  return (
    <WelcomePage
      onGetStarted={() => setActiveRoute("auth-signup")}
      onSignIn={() => setActiveRoute("auth-signin")}
    />
  );
}
