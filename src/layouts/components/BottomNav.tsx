import { HomeIcon, PlusIcon, ProfileIcon } from "../../components/Icons";
import { useLayout } from "../../app/contexts/useLayout";

export default function BottomNav() {
  const { setActiveRoute } = useLayout();

  const navItems = [
    { id: "home", label: "Home", Icon: HomeIcon, route: "home" },
    { id: "chats", label: "Chats", Icon: ProfileIcon, route: "connect" },
    { id: "create", label: "", Icon: PlusIcon, route: "create" },
    { id: "wallet", label: "Wallet", Icon: WalletIcon, route: "wallet" },
    { id: "profile", label: "Profile", Icon: ProfileIcon, route: "profile" },
  ] as const;

  return (
    <nav className="fresh-bottom-nav" aria-label="Primary navigation">
      {navItems.map(({ id, label, Icon, route }) => (
        <button
          key={id}
          type="button"
          className={`nav-item ${id}`}
          aria-label={label || "Create"}
          onClick={() => setActiveRoute(route)}
        >
          <span className={id === "create" ? "create-orb" : undefined}>
            <Icon size={id === "create" ? 30 : 24} />
          </span>
          {label && <span>{label}</span>}
        </button>
      ))}
    </nav>
  );
}

function WalletIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 9h18" />
      <path d="M16 14h3" />
    </svg>
  );
}
