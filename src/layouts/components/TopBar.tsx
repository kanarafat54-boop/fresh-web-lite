import { SearchIcon, ProfileIcon } from "../../components/Icons";
import { useLayout } from "../../app/contexts/useLayout";

export default function TopBar() {
  const { openSearch, setActiveRoute } = useLayout();

  return (
    <header className="fresh-topbar" aria-label="Fresh Web Lite top navigation">
      <div className="fresh-topbar-brand">
        <div className="fresh-topbar-logo" aria-label="Fresh Web Lite logo">FWL</div>
        <div>
          <div className="fresh-topbar-title">FRESH WEB <span>LITE</span></div>
          <div className="fresh-topbar-subtitle">The Universal AI Platform</div>
        </div>
      </div>

      <div className="fresh-topbar-actions">
        <button type="button" className="fresh-topbar-tool" aria-label="Search" onClick={openSearch}>
          <SearchIcon size={25} />
        </button>
        <button type="button" className="fresh-topbar-tool" aria-label="Voice search" onClick={openSearch}>
          <span aria-hidden="true">◖</span>
        </button>
        <button type="button" className="fresh-topbar-tool" aria-label="Language">
          <span aria-hidden="true">文</span>
        </button>
        <button type="button" className="fresh-topbar-avatar" aria-label="Open profile" onClick={() => setActiveRoute("profile")}>
          <ProfileIcon size={25} />
          <span className="fresh-topbar-online" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
