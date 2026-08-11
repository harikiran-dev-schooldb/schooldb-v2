import { feePaymentRepository } from "../repositories/fee-payment.repository";
import type { FeePaymentInput } from "../schemas/fee-payment.schema";

export const feePaymentService = {
  create(
    schoolId: string,
    input: FeePaymentInput,
  ) {
    return feePaymentRepository.create(
      schoolId,
      input,
    );
  },
};