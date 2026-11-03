/** Pure helpers for Audience Lens. No imports so they run under plain node tests. */

export type LensRaw = { enough?: boolean; viewers?: number; minViewers?: number; start?: number; q25?: number; q50?: number; q75?: number; complete?: number; skips?: number };
export type LensStep = { key: "start" | "q25" | "q50" | "q75" | "complete"; label: string; viewers: number; pct: number };
export type Lens =
  | { enough: false; viewers: number; minViewers: number }
  | { enough: true; viewers: number; steps: LensStep[]; biggestDrop: { from: string; to: string; lost: number } | null };

const LABELS: Array<[LensStep["key"], string]> = [["start", "Started"], ["q25", "25%"], ["q50", "50%"], ["q75", "75%"], ["complete", "Finished"]];
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

export function parseLens(raw: unknown): Lens {
  const r = (raw && typeof raw === "object" ? raw : {}) as LensRaw;
  const viewers = n(r.viewers);
  const minViewers = n(r.minViewers) || 5;
  if (r.enough !== true) return { enough: false, viewers, minViewers };
  // Counts can be uneven (a viewer may seek past a quartile), so force a non-increasing funnel.
  let prev = Infinity;
  const base = Math.max(n(r.start), n(r.q25));
  const steps: LensStep[] = LABELS.map(([key, label]) => {
    const raw = key === "start" ? base : n(r[key]);
    const viewersAt = Math.min(raw, prev);
    prev = viewersAt;
    return { key, label, viewers: viewersAt, pct: base > 0 ? Math.round((viewersAt / base) * 100) : 0 };
  });
  let biggestDrop: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < steps.length; i++) {
    const lost = steps[i - 1].viewers - steps[i].viewers;
    if (lost > 0 && (!biggestDrop || lost > biggestDrop.lost)) biggestDrop = { from: steps[i - 1].label, to: steps[i].label, lost };
  }
  return { enough: true, viewers, steps, biggestDrop };
}
