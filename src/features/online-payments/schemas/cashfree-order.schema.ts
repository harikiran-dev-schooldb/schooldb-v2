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
    allocations: z
      .array(
        z.object({
          installmentId: z.string().trim().min(1),
          amount: z
            .number()
            .finite()
            .positive()
            .refine(
              (amount) =>
                Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
              "Enter allocation amounts with no more than two decimal places.",
            ),
        }),
      )
      .min(1)
      .max(24)
      .optional(),
  })
  .refine((input) => input.studentId || input.studentEnrollmentId, {
    message: "A student or enrollment is required.",
  })
  .refine(
    (input) =>
      !input.allocations ||
      (input.allocations.length === input.installmentIds.length &&
        new Set(input.allocations.map((allocation) => allocation.installmentId))
          .size === input.allocations.length &&
        input.allocations.every((allocation) =>
          input.installmentIds.includes(allocation.installmentId),
        )),
    {
      message: "Provide one allocation for every selected installment.",
      path: ["allocations"],
    },
  )
  .refine(
    (input) =>
      input.amount === undefined ||
      !input.allocations ||
      Math.abs(
        input.amount -
          input.allocations.reduce(
            (total, allocation) => total + allocation.amount,
            0,
          ),
      ) < 0.005,
    {
      message: "Payment amount must equal the installment allocations.",
      path: ["amount"],
    },
  );

export type CashfreeOrderInput = z.infer<typeof cashfreeOrderSchema>;
