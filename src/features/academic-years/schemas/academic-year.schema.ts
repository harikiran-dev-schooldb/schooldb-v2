import { z } from "zod";

export const academicYearSchema = z.object({
  name: z.string().min(1, "Academic year is required"),

  startDate: z.string(),

  endDate: z.string(),
});

export type AcademicYearFormInput = z.input<
  typeof academicYearSchema
>;

export type AcademicYearFormOutput = z.output<
  typeof academicYearSchema
>;