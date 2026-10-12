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

export const cashfreeStaffOrderSchema = cashfreeOrderSchema
  .omit({ studentId: true })
  .extend({
    studentId: z.string().trim().min(1).optional(),
    studentEnrollmentId: z.string().trim().min(1).optional(),
    amount: z
      .number()
      .finite()
      .min(1, "Cashfree payments must be at least ₹1.")
      .refine(
        (amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
        "Enter an amount with no more than two decimal places.",
      )
      .optional(),
  })
  .refine((input) => input.studentId || input.studentEnrollmentId, {
    message: "A student or enrollment is required.",
  });

export type CashfreeOrderInput = z.infer<typeof cashfreeOrderSchema>;
