import { NextResponse } from "next/server";

export const MAX_SYNC_EXPORT_ROWS = 5_000;
export const EXPORT_QUERY_ROW_LIMIT = MAX_SYNC_EXPORT_ROWS + 1;

export function exportRowLimitResponse(
  rowCount: number,
  message = "This report is too large for an immediate Excel download.",
) {
  if (rowCount <= MAX_SYNC_EXPORT_ROWS) return null;

  return NextResponse.json(
    {
      success: false,
      code: "EXPORT_TOO_LARGE",
      message,
      rowLimit: MAX_SYNC_EXPORT_ROWS,
      suggestion:
        "Narrow the academic year, date, class, section, or status filters and try again. Large analytics exports can be prepared from the Reports page.",
    },
    { status: 413 },
  );
}
