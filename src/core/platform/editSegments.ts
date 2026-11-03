/** Pure: turns trim + cut edits into the ranges of the source that are kept. No imports. */
export type Range = [number, number];
type EditLike = { type: string; start?: number; end?: number };

const MIN_LEN = 0.05;

export function keepRanges(duration: number, edits: EditLike[]): Range[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  let lo = 0;
  let hi = duration;
  const trim = edits.find((e) => e.type === "trim" && Number.isFinite(e.start) && Number.isFinite(e.end));
  if (trim) { lo = Math.max(0, trim.start as number); hi = Math.min(duration, trim.end as number); }
  if (hi - lo < MIN_LEN) return [];
  let ranges: Range[] = [[lo, hi]];
  for (const e of edits) {
    if (e.type !== "cut" || !Number.isFinite(e.start) || !Number.isFinite(e.end)) continue;
    const cs = e.start as number, ce = e.end as number;
    if (ce <= cs) continue;
    const next: Range[] = [];
    for (const [a, b] of ranges) {
      if (ce <= a || cs >= b) { next.push([a, b]); continue; }
      if (cs > a) next.push([a, cs]);
      if (ce < b) next.push([ce, b]);
    }
    ranges = next;
  }
  return ranges.filter(([a, b]) => b - a >= MIN_LEN).map(([a, b]) => [round(a), round(b)]);
}

export function totalLength(ranges: Range[]): number {
  return round(ranges.reduce((s, [a, b]) => s + (b - a), 0));
}

/** Where a source time lands on the exported timeline, or null if it was cut. */
export function sourceToOutput(ranges: Range[], t: number): number | null {
  let acc = 0;
  for (const [a, b] of ranges) {
    if (t >= a && t <= b) return round(acc + (t - a));
    acc += b - a;
  }
  return null;
}

const round = (n: number) => Math.round(n * 1000) / 1000;
