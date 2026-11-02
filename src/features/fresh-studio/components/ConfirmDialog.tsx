import { useEffect, useRef } from "react";

type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmation for destructive operations (spec §18: Delete confirms). Escape cancels; focus starts on Cancel. */
export default function ConfirmDialog({ title, body, confirmLabel, destructive = false, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fs-modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="fs-modal" role="alertdialog" aria-modal="true" aria-labelledby="fs-confirm-title" aria-describedby="fs-confirm-body" onClick={(e) => e.stopPropagation()}>
        <h3 id="fs-confirm-title">{title}</h3>
        <p id="fs-confirm-body">{body}</p>
        <div className="fs-modal-actions">
          <button type="button" ref={cancelRef} className="fs-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className={`fs-btn ${destructive ? "fs-btn-danger" : "fs-btn-primary"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
