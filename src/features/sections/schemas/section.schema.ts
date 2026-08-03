import { z } from "zod";

export const sectionSchema = z.object({
  classId: z.string().min(1, "Class is required"),

  name: z.string().min(1, "Section name is required"),

  displayOrder: z.coerce.number().default(0),
});

export type SectionFormInput = z.input<typeof sectionSchema>;
export type SectionFormOutput = z.output<typeof sectionSchema>;