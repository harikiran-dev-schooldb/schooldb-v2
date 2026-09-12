import { z } from "zod";

export const cashfreeOrderSchema = z.object({
  schoolSlug: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  installmentIds: z.array(z.string().trim().min(1)).min(1).max(24),
  idempotencyKey: z.string().uuid(),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number.")
    .optional(),
});

export type CashfreeOrderInput = z.infer<typeof cashfreeOrderSchema>;
