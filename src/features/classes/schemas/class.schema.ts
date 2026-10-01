import { z } from "zod";

export const classSchema = z.object({
  syllabusId: z.string().min(1, "Syllabus is required"),

  branchId: z.string().min(1, "Academic branch is required"),

  name: z.string().min(1, "Class name is required"),

  code: z.string().optional(),

  description: z.string().optional(),

  displayOrder: z.coerce.number().default(0),
});

export type ClassFormInput = z.input<typeof classSchema>;
export type ClassFormOutput = z.output<typeof classSchema>;
