export type CashfreeInstallmentBalance = {
  id: string;
  outstanding: number;
};

export class CashfreeAmountError extends Error {}

function toPaise(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new CashfreeAmountError(`${label} is invalid.`);
  }

  const paise = Math.round(value * 100);
  if (Math.abs(value * 100 - paise) > 0.000001) {
    throw new CashfreeAmountError(`${label} cannot have more than two decimal places.`);
  }
  return paise;
}

export function cashfreeAllocationExceedsBalance(
  currentBalance: number,
  allocationAmount: number,
) {
  return (
    toPaise(allocationAmount, "Allocation amount") >
    toPaise(currentBalance, "Installment balance")
  );
}

export function allocateCashfreeAmount(
  installments: CashfreeInstallmentBalance[],
  requestedAmount: number,
) {
  const requestedPaise = toPaise(requestedAmount, "Payment amount");
  if (requestedPaise < 100) {
    throw new CashfreeAmountError("Cashfree payments must be at least ₹1.");
  }

  const balances = installments.map((installment) => ({
    id: installment.id,
    outstandingPaise: toPaise(installment.outstanding, "Installment balance"),
  }));
  const maximumPaise = balances.reduce(
    (total, installment) => total + installment.outstandingPaise,
    0,
  );
  if (requestedPaise > maximumPaise) {
    throw new CashfreeAmountError(
      "Payment amount cannot exceed the selected outstanding balance.",
    );
  }

  let remainingPaise = requestedPaise;
  const allocations: Array<{ studentFeeInstallmentId: string; amount: number }> = [];

  for (const installment of balances) {
    const amountPaise = Math.min(installment.outstandingPaise, remainingPaise);
    if (amountPaise > 0) {
      allocations.push({
        studentFeeInstallmentId: installment.id,
        amount: amountPaise / 100,
      });
      remainingPaise -= amountPaise;
    }
    if (remainingPaise === 0) break;
  }

  return {
    amount: requestedPaise / 100,
    maximumAmount: maximumPaise / 100,
    allocations,
  };
}
