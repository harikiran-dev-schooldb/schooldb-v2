import { z } from "zod";

export const studentEnrollmentSchema = z.object({
  studentId: z.string().min(1),

  academicYearId: z.string().min(1),

  classId: z.string().min(1),

  sectionId: z.string().min(1),

  rollNo: z.coerce.number().int().positive().optional(),

  admissionDate: z.string().optional(),

  active: z.boolean().default(true),
});

export type StudentEnrollmentFormInput =
  z.input<typeof studentEnrollmentSchema>;

export type StudentEnrollmentFormOutput =
  z.output<typeof studentEnrollmentSchema>;