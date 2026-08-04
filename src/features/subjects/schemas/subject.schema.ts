import { z } from "zod";

export const subjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Subject name is required.")
    .max(100),

  code: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),

  type: z.enum([
    "SCHOLASTIC",
    "CO_SCHOLASTIC",
  ]),

  displayOrder: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),

  active: z.boolean().default(true),
});

export type SubjectFormInput = z.input<
  typeof subjectSchema
>;

export type SubjectFormOutput = z.output<
  typeof subjectSchema
>;