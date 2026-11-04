import { supabase } from "../../../lib/supabase";

export type StudioShort = { id: string; caption: string; videoUrl: string; views: number; likes: number; comments: number; createdAt: string };
export type StudioTotals = { impressions: number; plays: number; completions: number; skips: number; likes: number; saves: number; shares: number };
export type StudioData = {
  shortCount: number; shortViews: number; shortLikes: number; reposts: number;
  followers: number; following: number; giftsCount: number; giftsMinor: number;
  window: StudioTotals; hasWindowData: boolean; daily: Array<{ date: string; plays: number }>;
  shorts: StudioShort[];
};

const WINDOW_DAYS = 28;
const num = (value: unknown) => { const n = Number(value ?? 0); return Number.isFinite(n) ? n : 0; };

/** Creator numbers from the user's own rows (owner-only RLS on analytics). Missing data stays 0, never estimated. */
export async function loadStudio(userId: string): Promise<StudioData> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const [content, analytics, shorts] = await Promise.all([
    supabase.from("user_content_analytics").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("fresh_creator_analytics").select("metric_date, impressions, plays, completions, skips, likes, saves, shares").eq("creator_id", userId).gte("metric_date", since).order("metric_date", { ascending: true }).limit(1000),
    supabase.from("shorts").select("id, caption, video_url, view_count, like_count, comment_count, created_at").eq("author_id", userId).order("created_at", { ascending: false }).limit(60),
  ]);
  const c: any = (content as any).data ?? {};
  const rows = (((analytics as any).data ?? []) as any[]);
  const window: StudioTotals = { impressions: 0, plays: 0, completions: 0, skips: 0, likes: 0, saves: 0, shares: 0 };
  const perDay = new Map<string, number>();
  for (const row of rows) {
    for (const key of Object.keys(window) as Array<keyof StudioTotals>) window[key] += num(row[key]);
    perDay.set(row.metric_date, (perDay.get(row.metric_date) ?? 0) + num(row.plays));
  }
  return {
    shortCount: num(c.short_count), shortViews: num(c.short_views), shortLikes: num(c.short_likes), reposts: num(c.short_reposts),
    followers: num(c.follower_count), following: num(c.following_count), giftsCount: num(c.gifts_received_count), giftsMinor: num(c.gifts_received_minor),
    window, hasWindowData: rows.length > 0, daily: [...perDay].map(([date, plays]) => ({ date, plays })),
    shorts: (((shorts as any).data ?? []) as any[]).map((r) => ({ id: r.id, caption: r.caption ?? "", videoUrl: r.video_url, views: num(r.view_count), likes: num(r.like_count), comments: num(r.comment_count), createdAt: r.created_at })),
  };
}

export function rate(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}
