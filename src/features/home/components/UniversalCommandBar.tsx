import { FormEvent, useMemo, useState } from "react";
import "./UniversalCommandBar.css";

type SearchMode = "instant" | "ai" | "research" | "private";

type UniversalCommandBarProps = {
  onSearch?: (query: string, mode: SearchMode) => void;
};

const MODES: Array<{ id: SearchMode; label: string; icon: string }> = [
  { id: "instant", label: "Instant", icon: "⚡" },
  { id: "ai", label: "AI", icon: "✦" },
  { id: "research", label: "Research", icon: "⌁" },
  { id: "private", label: "Private", icon: "◈" },
];

export default function UniversalCommandBar({ onSearch }: UniversalCommandBarProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("ai");
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);

  const placeholder = useMemo(
    () => (listening ? "Listening… speak, search or translate" : "Search, ask, speak or translate…"),
    [listening],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (value) onSearch?.(value, mode);
  };

  const toggleVoice = () => setListening((value) => !value);

  return (
    <section className="fresh-command" aria-label="Fresh universal search and command">
      <form className={`fresh-command__bar${listening ? " fresh-command__bar--listening" : ""}`} onSubmit={submit}>
        <span className="fresh-command__spark" aria-hidden="true">✦</span>
        <input
          aria-label="Search, ask, speak or translate"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button className="fresh-command__action" type="button" onClick={toggleVoice} aria-label={listening ? "Stop voice input" : "Start voice input"} aria-pressed={listening}>
          {listening ? "◉" : "🎙"}
        </button>
        <button className="fresh-command__action" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open search controls" aria-expanded={menuOpen}>
          ⋮
        </button>
      </form>

      {menuOpen && (
        <div className="fresh-command__panel" role="dialog" aria-label="Search controls">
          <div className="fresh-command__panel-heading">
            <strong>Fresh Search Control</strong>
            <span>Choose how Fresh should work</span>
          </div>
          <div className="fresh-command__modes" aria-label="Search mode">
            {MODES.map((item) => (
              <button key={item.id} type="button" className={mode === item.id ? "is-active" : ""} onClick={() => setMode(item.id)} aria-pressed={mode === item.id}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
          <div className="fresh-command__tools">
            <button type="button" onClick={() => setQuery((value) => `Translate: ${value}`)}>🌐 Translate</button>
            <button type="button" onClick={toggleVoice}>🎙 Voice</button>
            <button type="button" onClick={() => setQuery((value) => `Analyze: ${value}`)}>◌ Analyze</button>
            <button type="button" onClick={() => setQuery((value) => `Create: ${value}`)}>✦ Create</button>
          </div>
          <div className="fresh-command__providers">
            <span>Search source</span>
            <select aria-label="Search source" defaultValue="fresh">
              <option value="fresh">Fresh Search</option>
              <option value="multi">Multiple engines</option>
              <option value="google">Google</option>
              <option value="bing">Bing</option>
              <option value="duckduckgo">DuckDuckGo</option>
            </select>
          </div>
        </div>
      )}
    </section>
  );
}
