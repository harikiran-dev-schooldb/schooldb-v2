import { z } from "zod";

export const attendanceSessionSchema =
  z.object({
    timetableId: z.string().min(1),

    attendanceDate: z.string(),

    remarks: z.string().optional(),
  });

export type AttendanceSessionFormInput =
  z.input<typeof attendanceSessionSchema>;

export type AttendanceSessionFormOutput =
  z.output<typeof attendanceSessionSchema>;