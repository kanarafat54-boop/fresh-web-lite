import {
  HomeIcon,
  FeedIcon,
  PlusIcon,
  ProfileIcon,
  AIIcon,
} from "../../components/Icons";

const navItems = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "discover", label: "Discover", Icon: FeedIcon },
  { id: "create", label: "Create", Icon: PlusIcon },
  { id: "connect", label: "Connect", Icon: ProfileIcon },
  { id: "think", label: "Think", Icon: AIIcon },
] as const;

export default function BottomNav() {
  return (
    <nav className="fresh-bottom-nav" aria-label="Primary navigation">
      {navItems.map(({ id, label, Icon }) => (
        <button key={id} type="button" className={`nav-item ${id}`}>
          <Icon size={id === "create" ? 26 : 24} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
