import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);

export const syllabusSchema = z.object({
  name: z.string().trim().min(1, "Syllabus name is required"),
  code: optionalText,
  description: optionalText,
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const academicBranchSchema = z.object({
  syllabusId: z.string().trim().min(1, "Syllabus is required"),
  name: z.string().trim().min(1, "Branch name is required"),
  code: optionalText,
  description: optionalText,
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export type SyllabusInput = z.output<typeof syllabusSchema>;
export type AcademicBranchInput = z.output<typeof academicBranchSchema>;
