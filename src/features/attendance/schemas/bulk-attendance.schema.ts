import { z } from "zod";

export function isStrictIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

export function normalizeAdmissionNo(value: string) {
  return value.trim().toUpperCase();
}

const attendanceRowSchema = z.object({
  admissionNo: z.string().trim().min(1, "Admission number is required.").transform(normalizeAdmissionNo),
  date: z.string().trim().refine(isStrictIsoDate, "Date must be a valid calendar date in YYYY-MM-DD format."),
});

export const bulkAttendanceSchema = z.object({
  attendance: z.array(attendanceRowSchema).min(1).max(500),
});

export type BulkAttendanceRow = z.infer<typeof attendanceRowSchema>;
