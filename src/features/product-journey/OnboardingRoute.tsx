import { useLayout } from "../../app/contexts/useLayout";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import OnboardingPage from "./OnboardingPage";

export default function OnboardingRoute() {
  const { setActiveRoute } = useLayout();
  const { user } = useFreshId();
  return (
    <OnboardingPage
      userName={user?.fullName || user?.username || null}
      onContinue={() => setActiveRoute("feed")}
      onSkip={() => setActiveRoute("feed")}
    />
  );
}
