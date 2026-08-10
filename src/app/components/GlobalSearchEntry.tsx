import { useState } from "react";
import { FeatureRegistry } from "../registry/FeatureRegistry";
import { useLayout } from "../contexts/useLayout";
import { SearchIcon, XCircleIcon } from "../../components/Icons";

export default function GlobalSearchEntry() {
  const { searchOverlayOpen, openSearch, closeSearch, setActiveRoute } = useLayout();
  const [query, setQuery] = useState("");

  const results = FeatureRegistry.getAll().filter(
    (f) => f.searchable && f.name.toLowerCase().includes(query.toLowerCase())
  );

  if (!searchOverlayOpen) {
    return (
      <button className="icon-only-btn" onClick={openSearch}>
        <SearchIcon size={20} />
      </button>
    );
  }

  return (
    <div className="comment-panel-backdrop" onClick={closeSearch}>
      <div className="comment-panel" style={{ height: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="shorts-search-bar">
          <SearchIcon size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features..."
          />
          <button className="icon-only-btn" onClick={closeSearch}>
            <XCircleIcon size={16} />
          </button>
        </div>
        {results.map((f) => (
          <button
            key={f.id}
            className="share-option-btn"
            onClick={() => {
              setActiveRoute(f.id);
              closeSearch();
            }}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}
