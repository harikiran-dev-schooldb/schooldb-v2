import { z } from "zod";

export const ATTENDANCE_SESSION_TYPE = [
  "DAILY",
  "MORNING",
  "AFTERNOON",
  "PERIOD",
] as const;

export const attendanceSessionSchema = z
  .object({
    sessionType: z.enum(
      ATTENDANCE_SESSION_TYPE
    ),

    timetableId: z.string().optional(),

    academicYearId: z.string().min(1),

    classId: z.string().min(1),

    sectionId: z.string().min(1),

    attendanceDate: z.string().min(1),

    remarks: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.sessionType === "PERIOD" &&
      !data.timetableId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timetableId"],
        message:
          "Timetable is required for period attendance.",
      });
    }
  });

export type AttendanceSessionFormInput =
  z.input<typeof attendanceSessionSchema>;

export type AttendanceSessionFormOutput =
  z.output<typeof attendanceSessionSchema>;