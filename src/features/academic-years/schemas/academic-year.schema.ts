import { z } from "zod";

export const ATTENDANCE_MODES = [
  "ONCE_DAILY",
  "MORNING_AFTERNOON",
  "EVERY_PERIOD",
] as const;

export const academicYearSchema = z.object({
  name: z.string().min(1, "Academic year is required"),

  startDate: z.string(),

  endDate: z.string(),

  attendanceMode: z.enum(ATTENDANCE_MODES),
});

export type AcademicYearFormInput = z.input<
  typeof academicYearSchema
>;

export type AcademicYearFormOutput = z.output<
  typeof academicYearSchema
>;