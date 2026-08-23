import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { ProfileView } from "./ProfileView";

/**
 * Route adapter for the registry, which mounts features without props.
 * ProfileView can still be opened directly for another user's profile.
 */
export default function ProfileRoute() {
  const { user } = useFreshId();

  if (!user?.id) {
    return <ProfileView userId={""} onClose={() => window.history.back()} />;
  }

  return <ProfileView userId={user.id} onClose={() => window.history.back()} />;
}
