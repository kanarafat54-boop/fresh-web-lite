import { supabase } from "../../../lib/supabase";
import { buildReportRow, isMissingReportColumn, validateReport, type ReportDraft } from "./shortsReporting";

export type ReportResult = { status: "sent" | "duplicate"; explanationSaved: boolean };

/**
 * Files a report in `reports` (owner-insert row security). Throws with a plain message on failure so the screen
 * never claims success. If the viewer already has a report for the same target it says so instead of adding another.
 * Until the reporting migration is applied the explanation cannot be stored: the report is still saved and the
 * result says the explanation was not.
 */
export async function submitReport(reporterId: string, draft: ReportDraft): Promise<ReportResult> {
  const check = validateReport(draft);
  if (!check.ok) throw new Error(check.error);

  const existing = await supabase.from("reports").select("id").eq("reporter_id", reporterId).eq("target_type", draft.targetType).eq("target_id", draft.targetId).limit(1);
  if (!existing.error && (existing.data ?? []).length > 0) return { status: "duplicate", explanationSaved: true };

  const row = buildReportRow(draft, reporterId);
  const first = await supabase.from("reports").insert(row);
  if (!first.error) return { status: "sent", explanationSaved: true };
  if (isMissingReportColumn(first.error) && "details" in row) {
    const { details: _omitted, ...withoutDetails } = row;
    void _omitted;
    const retry = await supabase.from("reports").insert(withoutDetails);
    if (!retry.error) return { status: "sent", explanationSaved: false };
    throw new Error("Fresh could not save your report. Try again.");
  }
  throw new Error("Fresh could not save your report. Try again.");
}
