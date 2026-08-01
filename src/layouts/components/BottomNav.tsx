import {
  HomeIcon,
  FeedIcon,
  PlusIcon,
  ProfileIcon,
  AIIcon,
} from "../../components/Icons";

export default function BottomNav() {
  return (
    <nav className="fresh-bottom-nav">

      <button className="nav-item home">
        <HomeIcon size={24} />
        <span>Home</span>
      </button>

      <button className="nav-item feed">
        <FeedIcon size={24} />
        <span>Feed</span>
      </button>

      <button className="nav-item create">
        <PlusIcon size={26} />
        <span>Create</span>
      </button>

      <button className="nav-item profile">
        <ProfileIcon size={24} />
        <span>Profile</span>
      </button>

      <button className="nav-item ai">
        <AIIcon size={24} />
        <span>Fresh AI</span>
      </button>

    </nav>
  );
}
