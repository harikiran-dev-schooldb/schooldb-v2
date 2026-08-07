import { z } from "zod";

export const ATTENDANCE_STATUS = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
] as const;

export const attendanceRecordSchema =
  z.object({
    studentId: z.string().min(1),

    status: z.enum(
      ATTENDANCE_STATUS
    ),

    remarks: z.string().optional(),
  });

export const attendanceSchema =
  z.object({
    sessionId: z.string().min(1),

    attendance: z
      .array(
        attendanceRecordSchema
      )
      .min(1),
  });

export type AttendanceFormInput =
  z.input<typeof attendanceSchema>;

export type AttendanceFormOutput =
  z.output<typeof attendanceSchema>;