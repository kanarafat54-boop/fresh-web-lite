import { useLayout } from "../../app/contexts/useLayout";
import WelcomePage from "./WelcomePage";

/**
 * Mockup panel 1 → 2
 * Get Started → Sign Up surface
 * Sign In → Sign In surface
 */
export default function WelcomeRoute() {
  const { setActiveRoute } = useLayout();
  return (
    <WelcomePage
      onGetStarted={() => setActiveRoute("auth-signup")}
      onSignIn={() => setActiveRoute("auth-signin")}
    />
  );
}
