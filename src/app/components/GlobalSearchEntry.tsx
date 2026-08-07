import { useLayout } from "../contexts/LayoutContext";

export default function GlobalSearchEntry() {
  const { openSearch } = useLayout();

  return (
    <button
      className="global-search-entry"
      onClick={openSearch}
      aria-label="Open global search"
    >
      🔍 Search
    </button>
  );
}
