import { useLayout } from "../contexts/LayoutContext";

export default function TopBar() {
  const { openSearch, toggleSidebar } = useLayout();

  return (
    <header className="top-bar">
      <button onClick={toggleSidebar}>☰</button>

      <h1>Fresh Web Lite AI</h1>

      <button onClick={openSearch}>
        Search
      </button>
    </header>
  );
}
