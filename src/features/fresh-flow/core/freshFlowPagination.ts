import type { SupabaseClient } from "@supabase/supabase-js";

export const FRESH_FLOW_PAGE_SIZE = 24;

export type FreshFlowPageCursor = {
  offset: number;
};

export function encodeFreshFlowCursor(cursor: FreshFlowPageCursor | null) {
  return cursor ? String(Math.max(0, cursor.offset)) : null;
}

export function decodeFreshFlowCursor(value: string | null | undefined): FreshFlowPageCursor {
  const offset = Number.parseInt(value ?? "0", 10);
  return { offset: Number.isFinite(offset) && offset >= 0 ? offset : 0 };
}

export function nextFreshFlowCursor(current: string | null, received: number, pageSize = FRESH_FLOW_PAGE_SIZE) {
  const cursor = decodeFreshFlowCursor(current);
  return received < pageSize ? null : encodeFreshFlowCursor({ offset: cursor.offset + received });
}

/**
 * Shared bounded page primitive. Callers still apply their own RLS-safe filters.
 * Offset cursors are intentionally opaque to UI code and can later be replaced
 * by keyset cursors without changing the runtime contract.
 */
export async function fetchFreshFlowPage<T>(
  query: ReturnType<SupabaseClient["from"]>,
  cursor: string | null,
  pageSize = FRESH_FLOW_PAGE_SIZE,
) {
  const start = decodeFreshFlowCursor(cursor).offset;
  const end = start + pageSize - 1;
  const { data, error } = await query.range(start, end);
  const rows = (data ?? []) as T[];
  return {
    data: rows,
    error,
    cursor: error ? cursor : nextFreshFlowCursor(cursor, rows.length, pageSize),
    hasMore: !error && rows.length === pageSize,
  };
}
