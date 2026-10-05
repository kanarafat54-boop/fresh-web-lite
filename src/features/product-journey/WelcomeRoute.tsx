import { useLayout } from "../../app/contexts/useLayout";
import WelcomePage from "./WelcomePage";

export default function WelcomeRoute() {
  const { setActiveRoute } = useLayout();
  return (
    <WelcomePage
      onGetStarted={() => setActiveRoute("auth-signup")}
      onSignIn={() => setActiveRoute("auth-signin")}
    />
  );
}
