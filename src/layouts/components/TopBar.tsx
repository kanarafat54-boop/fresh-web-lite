import {
  SearchIcon,
  BellIcon,
  AIIcon,
  ProfileIcon,
} from "../../components/Icons";
import { useLayout } from "../../app/contexts/useLayout";

export default function TopBar() {
  const { openSearch, setActiveRoute } = useLayout();

  return (
    <header className="fresh-topbar">
      <div className="fresh-logo">
        <span className="logo-mark">F</span>
        <h1>Fresh Web Lite</h1>
      </div>

      <div className="top-actions">
        <button
          className="icon-btn"
          aria-label="Search the world"
          onClick={openSearch}
        >
          <SearchIcon />
        </button>

        <button
          className="icon-btn"
          aria-label="Fresh AI"
          onClick={() => setActiveRoute("ai")}
        >
          <AIIcon />
        </button>

        <button className="icon-btn" aria-label="Notifications">
          <BellIcon />
        </button>

        <button
          className="icon-btn"
          aria-label="Profile"
          onClick={() => setActiveRoute("profile")}
        >
          <ProfileIcon />
        </button>
      </div>
    </header>
  );
}
