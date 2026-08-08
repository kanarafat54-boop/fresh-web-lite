import { useLayout } from "../contexts/LayoutContext";

export default function TopBar() {
  const { toggleSidebar } = useLayout();

  return (
    <div className="top-bar">
      <button className="icon-only-btn" onClick={toggleSidebar}>☰</button>
      <span className="brand-name">Fresh Web Lite</span>
    </div>
  );
}
