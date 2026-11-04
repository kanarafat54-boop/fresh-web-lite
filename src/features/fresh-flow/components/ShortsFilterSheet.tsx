import { useEffect, useState } from "react";
import { DEFAULT_SHORT_FILTERS, activeFilterCount, type ShortFilters } from "../core/shortsFilters";
import "./ShortsFilterSheet.css";

type Option<T extends string> = { id: T; label: string };

const DATES: Array<Option<ShortFilters["date"]>> = [
  { id: "any", label: "Any time" }, { id: "day", label: "Today" }, { id: "week", label: "This week" }, { id: "month", label: "This month" },
];
const ORIGINS: Array<Option<ShortFilters["origin"]>> = [
  { id: "all", label: "All" }, { id: "original", label: "Original" }, { id: "remix", label: "Remixes and duets" },
];
const ORDERS: Array<Option<ShortFilters["order"]>> = [
  { id: "ranked", label: "For you" }, { id: "views", label: "Most viewed" }, { id: "newest", label: "Newest" },
];

function Chips<T extends string>({ label, value, options, onPick }: { label: string; value: T; options: Array<Option<T>>; onPick: (id: T) => void }) {
  return (
    <fieldset className="fresh-shorts-filter-group">
      <legend>{label}</legend>
      <div>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} className={value === o.id ? "active" : ""} onClick={() => onPick(o.id)}>{o.label}</button>
        ))}
      </div>
    </fieldset>
  );
}

/** Bottom sheet with the filters the loaded Shorts can actually support (see shortsFilters.ts). */
export function ShortsFilterSheet({ filters, mode, onApply, onModeChange, onClose }: {
  filters: ShortFilters;
  mode: "all" | "social";
  onApply: (next: ShortFilters) => void;
  onModeChange: (mode: "all" | "social") => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ShortFilters>(filters);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fresh-shorts-filter-backdrop" onClick={onClose}>
      <div className="fresh-shorts-filter-sheet" role="dialog" aria-modal="true" aria-label="Filter Shorts" onClick={(event) => event.stopPropagation()}>
        <div className="fresh-shorts-filter-head">
          <strong>Filters{activeFilterCount(draft) > 0 ? ` · ${activeFilterCount(draft)}` : ""}</strong>
          <button type="button" onClick={onClose} aria-label="Close filters">Close</button>
        </div>
        <div role="group" aria-label="Content filters" className="fresh-shorts-filter-group">
          <div>
            <button type="button" aria-pressed={mode === "all"} className={mode === "all" ? "active" : ""} onClick={() => onModeChange("all")}>All</button>
            <button type="button" aria-pressed={mode === "social"} className={mode === "social" ? "active" : ""} onClick={() => onModeChange("social")}>Social</button>
          </div>
        </div>
        <Chips label="Published" value={draft.date} options={DATES} onPick={(date) => setDraft({ ...draft, date })} />
        <Chips label="Content" value={draft.origin} options={ORIGINS} onPick={(origin) => setDraft({ ...draft, origin })} />
        <Chips label="Order" value={draft.order} options={ORDERS} onPick={(order) => setDraft({ ...draft, order })} />
        <label className="fresh-shorts-filter-creator">
          <span>Creator</span>
          <input type="search" value={draft.creator} maxLength={40} placeholder="Search by name or @username" onChange={(event) => setDraft({ ...draft, creator: event.target.value })} />
        </label>
        <div className="fresh-shorts-filter-actions">
          <button type="button" className="secondary" onClick={() => setDraft(DEFAULT_SHORT_FILTERS)}>Reset</button>
          <button type="button" className="primary" onClick={() => { onApply(draft); onClose(); }}>Apply</button>
        </div>
      </div>
    </div>
  );
}
