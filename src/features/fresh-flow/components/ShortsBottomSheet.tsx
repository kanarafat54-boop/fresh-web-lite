import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import "./shortsBottomSheet.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DISMISS_DISTANCE = 96;
const DISMISS_VELOCITY = 0.6;

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra controls placed in the header, left of the close button (for example a settings button). */
  headerActions?: ReactNode;
  /** Adds a class to the sheet itself, for sheet-specific sizing. */
  className?: string;
};

/**
 * The one bottom sheet for Fresh Shorts screens (watch history, saved, collections, settings lists).
 *
 * It owns what every sheet had to repeat: a dialog with a title, a drag handle that closes the sheet when pulled down,
 * Escape and backdrop-click to close, focus moved in on open and given back on close, and Tab kept inside the sheet.
 * Markup keeps the existing `shorts-sheet*` class names, so the sheets look the same and are still styled by the
 * existing stylesheets; the handle and drag motion are the only additions.
 */
export default function ShortsBottomSheet({ title, onClose, children, headerActions, className = "" }: Props) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const drag = useRef<{ startY: number; startTime: number; pointerId: number } | null>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous && previous.isConnected) previous.focus();
    };
  }, []);

  const trapTab = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const items = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, []);

  function moveSheet(distance: number, animate: boolean) {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transition = animate ? "transform 0.2s ease" : "none";
    sheet.style.transform = distance > 0 ? `translateY(${distance}px)` : "";
  }

  function onHandleDown(event: ReactPointerEvent<HTMLDivElement>) {
    drag.current = { startY: event.clientY, startTime: event.timeStamp, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function onHandleMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    moveSheet(Math.max(0, event.clientY - drag.current.startY), false);
  }
  function onHandleUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    event.currentTarget.releasePointerCapture?.(state.pointerId);
    const distance = Math.max(0, event.clientY - state.startY);
    const velocity = distance / Math.max(1, event.timeStamp - state.startTime);
    if (distance > DISMISS_DISTANCE || (distance > 24 && velocity > DISMISS_VELOCITY)) onCloseRef.current();
    else moveSheet(0, true);
  }
  function onHandleCancel() { drag.current = null; moveSheet(0, true); }

  return (
    <div className="shorts-sheet-backdrop" onClick={() => onCloseRef.current()}>
      <div ref={sheetRef} className={`shorts-sheet shorts-bottom-sheet${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()} onKeyDown={trapTab}>
        <div className="shorts-sheet-handle" aria-hidden="true" onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleCancel}><span /></div>
        <div className="shorts-sheet-header">
          <h3>{title}</h3>
          <div className="shorts-sheet-header-actions">
            {headerActions}
            <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={() => onCloseRef.current()} aria-label="Close">✕</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
