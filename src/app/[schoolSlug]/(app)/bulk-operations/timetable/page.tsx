"use client";

import { BulkCsvImport, type CsvRow } from "@/components/bulk/BulkCsvImport";

const HEADERS = [
  "academicYear",
  "employeeId",
  "subject",
  "className",
  "section",
  "period",
  "day",
  "active",
] as const;

const VALID_DAYS = new Set([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);

function validateRow(row: CsvRow) {
  if (
    !row.academicYear?.trim() ||
    !row.employeeId?.trim() ||
    !row.subject?.trim() ||
    !row.className?.trim() ||
    !row.section?.trim() ||
    !row.period?.trim() ||
    !row.day?.trim()
  ) {
    return "Academic year, employee ID, subject, class, section, period and day are required.";
  }

  if (!VALID_DAYS.has(row.day.trim().toUpperCase())) {
    return "Day must be MONDAY through SATURDAY.";
  }

  if (
    row.active?.trim() &&
    !/^(true|false|yes|no|1|0)$/i.test(row.active.trim())
  ) {
    return "Active must be true/false, yes/no, or 1/0.";
  }

  return null;
}

function normalizeRow(row: CsvRow) {
  return {
    ...row,
    academicYear: row.academicYear.trim(),
    employeeId: row.employeeId.trim(),
    subject: row.subject.trim(),
    className: row.className.trim(),
    section: row.section.trim(),
    period: row.period.trim(),
    day: row.day.trim().toUpperCase(),
    active: /^(false|no|0)$/i.test(row.active?.trim() || "true")
      ? "false"
      : "true",
  };
}

export default function BulkTimetablePage() {
  return (
    <BulkCsvImport
      title="Bulk Timetable"
      description="Create timetable slots or update their teacher, subject and active status from one validated CSV."
      importTitle="Timetable create / update"
      uploadLabel="Upload timetable CSV"
      entityLabel="Timetable"
      endpoint="/api/v1/timetables/bulk"
      bodyKey="timetables"
      headers={HEADERS}
      sampleRows={[
        [
          "2026-27",
          "T001",
          "Mathematics",
          "Class 1",
          "A",
          "Period 1",
          "MONDAY",
          "true",
        ],
        [
          "2026-27",
          "T002",
          "English",
          "Class 1",
          "A",
          "Period 2",
          "MONDAY",
          "true",
        ],
      ]}
      templateFileName="schooldb-timetable-create-update.csv"
      validateRow={validateRow}
      normalizeRow={normalizeRow}
      duplicateKey={(row) =>
        [
          row.academicYear,
          row.className,
          row.section,
          row.period,
          row.day,
        ].join("|")
      }
      duplicateLabel="timetable slots"
    />
  );
}
