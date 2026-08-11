import { z } from "zod";

export const feePaymentAllocationSchema = z.object({
  studentFeeInstallmentId: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export const feePaymentSchema = z.object({
  studentEnrollmentId: z.string().min(1),

  allocations: z
    .array(feePaymentAllocationSchema)
    .min(1, "At least one installment is required."),

  paymentDate: z.string().min(1),

  paymentMode: z.enum([
    "CASH",
    "UPI",
    "CARD",
    "BANK_TRANSFER",
    "CHEQUE",
    "ONLINE",
  ]),

  referenceNo: z.string().trim().optional(),

  remarks: z.string().trim().optional(),
});

export type FeePaymentInput =
  z.infer<typeof feePaymentSchema>;