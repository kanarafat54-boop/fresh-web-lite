import { useCallback, useEffect, useState } from "react";
import { breakDue, dayKey, type BreakReason, type ShortsPrivacySettings } from "./shortsPrivacy";

const KEY_PREFIX = "fresh-shorts-watch-minutes:";
const TICK_MS = 15_000;
const EXTRA_STEP = 10;

function readMinutes(key: string): number {
  try { const n = Number(localStorage.getItem(KEY_PREFIX + key)); return Number.isFinite(n) && n >= 0 ? n : 0; } catch { return 0; }
}

function writeMinutes(key: string, value: number): void {
  try { localStorage.setItem(KEY_PREFIX + key, String(value)); } catch { /* storage unavailable: the limit then only holds for this visit */ }
}

/**
 * Quiet Mode (spec 3.10): counts minutes Shorts is open and visible today on this device, and reports when a break screen is due.
 * Only counts while `active` is true (Shorts on screen and the viewer signed in). Nothing is sent anywhere.
 */
export function useQuietBreak(settings: ShortsPrivacySettings, active: boolean): { reason: BreakReason | null; keepWatching: () => void } {
  const [reason, setReason] = useState<BreakReason | null>(null);
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    if (!active || !settings.quietEnabled) { setReason(null); return; }
    const evaluate = () => { const now = new Date(); setReason(breakDue(settings, readMinutes(dayKey(now)), now, extra)); };
    evaluate();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        const key = dayKey(new Date());
        writeMinutes(key, readMinutes(key) + TICK_MS / 60_000);
      }
      evaluate();
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [active, settings, extra]);

  const keepWatching = useCallback(() => { setExtra((value) => value + EXTRA_STEP); setReason(null); }, []);
  return { reason, keepWatching };
}
