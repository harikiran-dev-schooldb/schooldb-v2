import { z } from "zod";

export const feePlanItemSchema = z.object({
  feeCategoryId: z.string().min(1),

  frequency: z.enum([
    "MONTHLY",
    "QUARTERLY",
    "TERMLY",
    "HALF_YEARLY",
    "ANNUAL",
    "CUSTOM",
  ]),

  amount: z.coerce.number().positive(),

  mandatory: z.boolean().optional().default(true),
});

export const feePlanSchema = z.object({
  academicYearId: z.string().min(1),

  name: z
    .string()
    .trim()
    .min(1, "Fee plan name is required.")
    .max(150),

  description: z
    .string()
    .trim()
    .max(500)
    .optional(),

  appliesToAllClasses: z.boolean().optional().default(false),

  classIds: z.array(z.string().min(1)).default([]),

  items: z
    .array(feePlanItemSchema)
    .min(1, "At least one fee item is required."),
});

export const feePlanStatusSchema = z.object({
  active: z.boolean(),
});

export type FeePlanStatusInput = z.infer<
  typeof feePlanStatusSchema
>;

// Raw values used by React Hook Form
export type FeePlanFormValues =
  z.input<typeof feePlanSchema>;

// Validated/transformed values after Zod parsing
export type FeePlanInput =
  z.output<typeof feePlanSchema>;