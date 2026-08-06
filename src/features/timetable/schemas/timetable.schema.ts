import { z } from "zod";

export const WEEK_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export const timetableSchema = z.object({
  academicYearId: z.string().min(1),
  teacherAllocationId: z.string().min(1),
  periodId: z.string().min(1),

  day: z.enum(WEEK_DAYS),

  active: z.boolean().default(true),
});

export type TimetableFormInput =
  z.input<typeof timetableSchema>;

export type TimetableFormOutput =
  z.output<typeof timetableSchema>;