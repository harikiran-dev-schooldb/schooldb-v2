import { z } from "zod";

export const customInstallmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Installment name is required.")
    .max(100),

  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero."),

  dueDate: z
    .string()
    .min(1, "Due date is required."),

  sequence: z
    .number()
    .int()
    .positive(),

  periodStart: z
    .string()
    .optional(),

  periodEnd: z
    .string()
    .optional(),
});

export const customInstallmentsSchema = z.object({
  installments: z
    .array(customInstallmentSchema)
    .min(1, "At least one installment is required."),
});

export type CustomInstallmentsInput =
  z.infer<typeof customInstallmentsSchema>;