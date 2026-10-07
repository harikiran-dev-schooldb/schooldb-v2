import { CalendarDays } from "lucide-react";

import {
  BULK_DATE_FORMATS,
  type BulkDateFormat,
} from "@/lib/bulk-date";

export function BulkDateFormatSelector({
  value,
  onChange,
  fields,
  disabled = false,
}: {
  value: BulkDateFormat | "";
  onChange: (value: BulkDateFormat) => void;
  fields: readonly string[];
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            <CalendarDays className="size-5" />
          </span>
          <div>
            <label htmlFor="bulk-date-format" className="text-sm font-bold">
              Date format in your CSV
            </label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Choose the format used for {fields.join(", ")}. SchoolDB converts these values to YYYY-MM-DD before validation.
            </p>
          </div>
        </div>
        <select
          id="bulk-date-format"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as BulkDateFormat)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 sm:w-72"
        >
          <option value="" disabled>Choose date format…</option>
          {BULK_DATE_FORMATS.map((format) => (
            <option key={format.value} value={format.value}>
              {format.label} — e.g. {format.example}
            </option>
          ))}
        </select>
      </div>
      {!value ? (
        <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
          Select a date format to enable the CSV upload.
        </p>
      ) : null}
    </div>
  );
}
