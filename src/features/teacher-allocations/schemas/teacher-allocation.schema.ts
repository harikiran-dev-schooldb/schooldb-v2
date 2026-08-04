import { z } from "zod";

export const teacherAllocationSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year is required."),

  teacherId: z.string().min(1, "Teacher is required."),

  subjectId: z.string().min(1, "Subject is required."),

  classId: z.string().min(1, "Class is required."),

  sectionId: z.string().min(1, "Section is required."),

  remarks: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  active: z.boolean().default(true),
});

export type TeacherAllocationFormInput =
  z.input<typeof teacherAllocationSchema>;

export type TeacherAllocationFormOutput =
  z.output<typeof teacherAllocationSchema>;