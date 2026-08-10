import { z } from "zod";

export const feeCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Fee category name is required.")
    .max(100),

  code: z
    .string()
    .trim()
    .max(30)
    .optional(),

  description: z
    .string()
    .trim()
    .max(500)
    .optional(),

  active: z.boolean().optional(),
});

export type FeeCategoryInput =
  z.infer<typeof feeCategorySchema>;