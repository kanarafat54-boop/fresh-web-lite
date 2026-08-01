import {
  SearchIcon,
  BellIcon,
  AIIcon,
  ProfileIcon,
} from "../../components/Icons";

export default function TopBar() {
  return (
    <header className="fresh-topbar">
      <div className="fresh-logo">
        <span className="logo-mark">F</span>
        <h1>Fresh Web Lite</h1>
      </div>

      <div className="top-actions">
        <button className="icon-btn">
          <SearchIcon />
        </button>

        <button className="icon-btn">
          <AIIcon />
        </button>

        <button className="icon-btn">
          <BellIcon />
        </button>

        <button className="icon-btn">
          <ProfileIcon />
        </button>
      </div>
    </header>
  );
}
