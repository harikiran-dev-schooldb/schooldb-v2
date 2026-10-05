"use client";

import { BulkCsvImport, type CsvRow } from "@/components/bulk/BulkCsvImport";

const HEADERS = [
  "name",
  "startTime",
  "endTime",
  "displayOrder",
  "active",
] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateRow(row: CsvRow) {
  if (!row.name?.trim()) return "Period name is required.";
  if (row.name.trim().length > 50)
    return "Period name must be 50 characters or less.";
  if (!TIME_PATTERN.test(row.startTime?.trim() || ""))
    return "Start time must use 24-hour HH:mm format.";
  if (!TIME_PATTERN.test(row.endTime?.trim() || ""))
    return "End time must use 24-hour HH:mm format.";
  if (toMinutes(row.endTime) <= toMinutes(row.startTime))
    return "End time must be after start time.";

  const displayOrder = Number(row.displayOrder);
  if (!Number.isInteger(displayOrder) || displayOrder < 1)
    return "Display order must be an integer of 1 or more.";
  if (!/^(true|false|yes|no|1|0)$/i.test(row.active?.trim() || "true"))
    return "Active must be true/false, yes/no, or 1/0.";

  return null;
}

function normalizeRow(row: CsvRow) {
  return {
    name: row.name.trim(),
    startTime: row.startTime.trim(),
    endTime: row.endTime.trim(),
    displayOrder: String(Number(row.displayOrder)),
    active: /^(false|no|0)$/i.test(row.active?.trim() || "true")
      ? "false"
      : "true",
  };
}

export default function BulkPeriodsPage() {
  return (
    <BulkCsvImport
      title="Bulk School Periods"
      description="Create new periods or update existing periods by matching the period name."
      importTitle="Period create / update"
      uploadLabel="Upload school periods CSV"
      entityLabel="School Periods"
      endpoint="/api/v1/periods/bulk"
      bodyKey="periods"
      headers={HEADERS}
      sampleRows={[
        ["Period 1", "08:30", "09:15", "1", "true"],
        ["Period 2", "09:15", "10:00", "2", "true"],
        ["Short Break", "10:00", "10:15", "3", "true"],
      ]}
      templateFileName="schooldb-periods-create-update.csv"
      validateRow={validateRow}
      normalizeRow={normalizeRow}
      duplicateKey={(row) => row.name}
      duplicateLabel="period names"
    />
  );
}
