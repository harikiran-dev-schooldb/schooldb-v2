import { z } from "zod";

const attendanceRowSchema = z.object({
  admissionNo: z.string().trim().min(1, "Admission number is required."),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."),
});

export const bulkAttendanceSchema = z.object({
  attendance: z.array(attendanceRowSchema).min(1).max(500),
});

export type BulkAttendanceRow = z.infer<typeof attendanceRowSchema>;
