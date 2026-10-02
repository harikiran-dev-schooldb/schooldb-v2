import { z } from "zod";

export const classTeacherAssignmentSchema = z.object({
  academicYearId: z.string().min(1, "Academic year is required."),
  teacherId: z.string().min(1, "Teacher is required."),
  classId: z.string().min(1, "Class is required."),
  sectionId: z.string().min(1, "Section is required."),
  remarks: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export type ClassTeacherAssignmentInput = z.output<
  typeof classTeacherAssignmentSchema
>;
