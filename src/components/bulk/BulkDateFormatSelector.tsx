"use client";

import { CalendarDays } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <Select
          value={value}
          disabled={disabled}
          onValueChange={(nextValue) => onChange(nextValue as BulkDateFormat)}
        >
          <SelectTrigger
            id="bulk-date-format"
            aria-label="Date format in your CSV"
            className="h-11 w-full rounded-xl border-border/80 bg-card px-4 font-semibold text-foreground shadow-sm hover:border-primary/25 hover:bg-primary/[0.04] hover:text-primary sm:h-10 sm:w-80"
          >
            <SelectValue placeholder="Choose date format…" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/70 p-1 shadow-[0_24px_60px_rgb(15_23_42_/_0.18)]">
            {BULK_DATE_FORMATS.map((format) => (
              <SelectItem key={format.value} value={format.value} className="rounded-xl py-2.5">
                {format.label} · Example {format.example}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!value ? (
        <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
          Select a date format to enable the CSV upload.
        </p>
      ) : null}
    </div>
  );
}
