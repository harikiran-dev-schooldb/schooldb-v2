import { z } from "zod";

export const studentPromotionSchema = z.object({
  fromAcademicYearId: z.string().min(1),
  toAcademicYearId: z.string().min(1),

  fromClassId: z.string().min(1),
  fromSectionId: z.string().min(1),

  toClassId: z.string().min(1),
  toSectionId: z.string().min(1),

  students: z
    .array(
      z.object({
        studentId: z.string().min(1),
        rollNo: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1, "Select at least one student."),
});

export type StudentPromotionInput = z.infer<
  typeof studentPromotionSchema
>;