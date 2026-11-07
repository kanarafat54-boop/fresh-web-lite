import { useEffect, useRef, useState, type FormEvent } from "react";

type Props = {
  title: string;
  label: string;
  initial: string;
  confirmLabel: string;
  maxLength?: number;
  allowEmpty?: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
};

export default function TextPromptDialog({ title, label, initial, confirmLabel, maxLength = 120, allowEmpty = false, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!allowEmpty && !value.trim()) return;
    onSubmit(value);
  };

  return (
    <div className="fs-modal-backdrop" role="presentation" onClick={onCancel}>
      <form className="fs-modal" role="dialog" aria-modal="true" aria-labelledby="fs-prompt-title" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 id="fs-prompt-title">{title}</h3>
        <label className="fs-field">
          <span>{label}</span>
          <input ref={inputRef} value={value} maxLength={maxLength} onChange={(e) => setValue(e.target.value)} />
        </label>
        <div className="fs-modal-actions">
          <button type="button" className="fs-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="fs-btn fs-btn-primary" disabled={!allowEmpty && !value.trim()}>{confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}
