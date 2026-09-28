export type InstallmentSequenceRecord = {
  id: string;
  name: string;
  studentFeeId: string;
  sequence: number;
  payableAmount: number;
  paidAmount: number;
  status?: string;
};

export type InstallmentPaymentAllocation = {
  studentFeeInstallmentId: string;
  amount: number;
};

export type InstallmentSequenceViolation = {
  installmentName: string;
  blockingInstallmentName: string;
};

const MONEY_EPSILON = 0.005;

export function findInstallmentSequenceViolation(
  installments: InstallmentSequenceRecord[],
  allocations: InstallmentPaymentAllocation[],
): InstallmentSequenceViolation | null {
  const allocationAmounts = new Map<string, number>();

  for (const allocation of allocations) {
    allocationAmounts.set(
      allocation.studentFeeInstallmentId,
      (allocationAmounts.get(allocation.studentFeeInstallmentId) ?? 0) +
        allocation.amount,
    );
  }

  const installmentsById = new Map(
    installments.map((installment) => [installment.id, installment]),
  );

  for (const allocation of allocations) {
    const installment = installmentsById.get(
      allocation.studentFeeInstallmentId,
    );

    if (!installment || allocation.amount <= 0) continue;

    const blockingInstallment = installments
      .filter(
        (candidate) =>
          candidate.studentFeeId === installment.studentFeeId &&
          candidate.sequence < installment.sequence &&
          candidate.status !== "WAIVED",
      )
      .sort((a, b) => a.sequence - b.sequence)
      .find((candidate) => {
        const paidAfterPayment =
          candidate.paidAmount + (allocationAmounts.get(candidate.id) ?? 0);

        return candidate.payableAmount - paidAfterPayment > MONEY_EPSILON;
      });

    if (blockingInstallment) {
      return {
        installmentName: installment.name,
        blockingInstallmentName: blockingInstallment.name,
      };
    }
  }

  return null;
}
