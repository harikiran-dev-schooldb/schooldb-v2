"use client";

import { BulkCsvImport, type CsvRow } from "@/components/bulk/BulkCsvImport";

const HEADERS = [
  "registrationNo",
  "vehicleName",
  "vehicleType",
  "capacity",
  "driverName",
  "driverPhone",
  "attendantName",
  "attendantPhone",
  "routeCode",
  "routeName",
  "pickupStart",
  "dropStart",
  "stopName",
  "stopSequence",
  "pickupTime",
  "dropTime",
  "monthlyFee",
  "academicYear",
  "admissionNo",
  "pickupEnabled",
  "dropEnabled",
  "startDate",
  "notes",
] as const;

const SAMPLE_ROWS = [
  ["AP31AB1234", "Bus 1", "BUS", "45", "Ravi Kumar", "9876543210", "Suresh", "9876543211", "R-01", "MVP Colony Route", "07:00", "15:30", "MVP Double Road", "1", "07:10", "15:40", "1500", "2026-27", "14570", "true", "true", "2026-06-01", ""],
  ["AP31AB1234", "Bus 1", "BUS", "45", "Ravi Kumar", "9876543210", "Suresh", "9876543211", "R-01", "MVP Colony Route", "07:00", "15:30", "Sector 5", "2", "07:20", "15:50", "1400", "", "", "", "", "", ""],
] as const;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const BOOLEAN = /^(true|false|yes|no|1|0)$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function validateTransportRow(row: CsvRow) {
  if (!row.registrationNo || row.registrationNo.length < 4 || row.registrationNo.length > 30) return "Registration number must contain 4 to 30 characters.";
  if (!/^(BUS|VAN|MINI_BUS|OTHER)$/i.test(row.vehicleType)) return "Vehicle type must be BUS, VAN, MINI_BUS or OTHER.";
  const capacity = Number(row.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return "Capacity must be a whole number from 1 to 100.";
  if (!row.driverName || row.driverName.length < 2 || row.driverName.length > 120) return "Driver name must contain 2 to 120 characters.";
  if (!/^\d{10}$/.test(row.driverPhone)) return "Driver phone must contain exactly 10 digits.";
  if (row.attendantPhone && !/^\d{10}$/.test(row.attendantPhone)) return "Attendant phone must contain exactly 10 digits.";
  if (!row.routeCode || row.routeCode.length > 30) return "Route code is required and must be 30 characters or less.";
  if (!row.routeName || row.routeName.length < 2 || row.routeName.length > 160) return "Route name must contain 2 to 160 characters.";
  if (!row.stopName || row.stopName.length < 2 || row.stopName.length > 160) return "Stop name must contain 2 to 160 characters.";
  const sequence = Number(row.stopSequence);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) return "Stop sequence must be a whole number from 1 to 999.";
  for (const [label, value] of [["Pickup start", row.pickupStart], ["Drop start", row.dropStart], ["Pickup time", row.pickupTime], ["Drop time", row.dropTime]]) {
    if (value && !TIME.test(value)) return `${label} must use 24-hour HH:MM format.`;
  }
  if (row.monthlyFee && (!Number.isFinite(Number(row.monthlyFee)) || Number(row.monthlyFee) < 0 || Number(row.monthlyFee) > 1_000_000)) return "Monthly fee must be between 0 and 1,000,000.";

  const assignmentValues = [row.academicYear, row.admissionNo, row.pickupEnabled, row.dropEnabled, row.startDate];
  const hasAssignment = assignmentValues.some(Boolean);
  if (hasAssignment && assignmentValues.some((value) => !value)) return "For a student assignment, academic year, admission number, pickup, drop and start date are all required.";
  if (hasAssignment && (!BOOLEAN.test(row.pickupEnabled) || !BOOLEAN.test(row.dropEnabled))) return "Pickup and drop values must be true/false, yes/no, or 1/0.";
  if (hasAssignment && !/^(true|yes|1)$/i.test(row.pickupEnabled) && !/^(true|yes|1)$/i.test(row.dropEnabled)) return "At least pickup or drop must be enabled.";
  if (hasAssignment && !DATE.test(row.startDate)) return "Start date must use YYYY-MM-DD format.";
  if (row.notes.length > 500) return "Notes must be 500 characters or less.";
  return null;
}

function normalizeTransportRow(row: CsvRow) {
  return {
    ...row,
    registrationNo: row.registrationNo.toUpperCase(),
    vehicleType: row.vehicleType.toUpperCase(),
    capacity: String(Number(row.capacity)),
    routeCode: row.routeCode.toUpperCase(),
    stopSequence: String(Number(row.stopSequence)),
    pickupEnabled: row.pickupEnabled ? String(/^(true|yes|1)$/i.test(row.pickupEnabled)) : "",
    dropEnabled: row.dropEnabled ? String(/^(true|yes|1)$/i.test(row.dropEnabled)) : "",
  };
}

export default function BulkTransportPage() {
  return (
    <BulkCsvImport
      title="Bulk Transport"
      description="Import vehicles, routes and stops, with optional student assignments, from one validated CSV."
      importTitle="Transport setup and assignment import"
      uploadLabel="Upload transport CSV"
      entityLabel="Transport"
      endpoint="/api/v1/transport/bulk"
      bodyKey="rows"
      headers={HEADERS}
      sampleRows={SAMPLE_ROWS}
      templateFileName="schooldb-transport-template.csv"
      validateRow={validateTransportRow}
      normalizeRow={normalizeTransportRow}
      duplicateKey={(row) => `${row.routeCode}:${row.stopName}:${row.admissionNo || "setup"}`}
      duplicateLabel="route, stop and student rows"
    />
  );
}
