/**
 * Fresh Web Lite
 * Reaction Picker — press-and-hold popup, tap for quick default
 */

import { useRef, useState } from "react";
import { reactionEmoji, reactionOrder } from "../../../components/Icons";

interface ReactionPickerProps {
  myReaction: string | null;
  count: number;
  disabled?: boolean;
  variant?: "feed" | "short";
  onReact: (type: string) => void;
}

export function ReactionPicker({ myReaction, count, disabled, variant = "feed", onReact }: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  function startPress() {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setShowPicker(true);
    }, 400);
  }

  function endPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!longPressedRef.current && !showPicker) {
      onReact(myReaction ? myReaction : "like");
    }
  }

  function pick(type: string) {
    onReact(type);
    setShowPicker(false);
  }

  const btnClass =
    variant === "short"
      ? myReaction
        ? "short-like-btn liked"
        : "short-like-btn"
      : myReaction
      ? "like-btn liked"
      : "like-btn";

  const popupClass = variant === "short" ? "reaction-popup short-variant" : "reaction-popup";

  return (
    <div className="reaction-wrap">
      {showPicker && (
        <div className="reaction-popup-backdrop" onClick={() => setShowPicker(false)}>
          <div className={popupClass} onClick={(e) => e.stopPropagation()}>
            {reactionOrder.map((type) => (
              <button key={type} className="reaction-option" onClick={() => pick(type)}>
                {reactionEmoji[type]}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className={btnClass}
        disabled={disabled}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={() => timerRef.current && clearTimeout(timerRef.current)}
      >
        <span style={{ fontSize: variant === "short" ? "1.5rem" : "1.05rem" }}>
          {myReaction ? reactionEmoji[myReaction] : "👍"}
        </span>
        {variant === "short" ? <span>{count}</span> : count}
      </button>
    </div>
  );
}
