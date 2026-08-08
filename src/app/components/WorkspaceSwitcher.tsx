import { useFreshId } from "../../features/fresh-id/context/FreshIdContext";

export default function WorkspaceSwitcher() {
  const { user, isGuest } = useFreshId();
  if (!user) return null;

  return (
    <div className="fresh-id-badge" style={{ margin: 0 }}>
      <div className="fresh-id-row">
        <span className="fresh-id-name">{user.fullName}</span>
        <span className="fresh-id-tier">{isGuest ? "guest" : user.subscription.tier}</span>
      </div>
    </div>
  );
}
