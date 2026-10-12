import assert from "node:assert/strict";
import test from "node:test";

import {
  allocateCashfreeAmount,
  CashfreeAmountError,
} from "../src/features/online-payments/cashfree-allocation.ts";

const installments = [
  { id: "term-1", outstanding: 5000 },
  { id: "term-2", outstanding: 4000 },
];

test("allows a partial Cashfree amount", () => {
  assert.deepEqual(allocateCashfreeAmount(installments, 1250), {
    amount: 1250,
    maximumAmount: 9000,
    allocations: [{ studentFeeInstallmentId: "term-1", amount: 1250 }],
  });
});

test("allocates across selected installments in order", () => {
  assert.deepEqual(allocateCashfreeAmount(installments, 6250), {
    amount: 6250,
    maximumAmount: 9000,
    allocations: [
      { studentFeeInstallmentId: "term-1", amount: 5000 },
      { studentFeeInstallmentId: "term-2", amount: 1250 },
    ],
  });
});

test("rejects an amount above the selected balance", () => {
  assert.throws(
    () => allocateCashfreeAmount(installments, 9000.01),
    CashfreeAmountError,
  );
});

test("rejects sub-rupee and over-precision amounts", () => {
  assert.throws(() => allocateCashfreeAmount(installments, 0.5), CashfreeAmountError);
  assert.throws(() => allocateCashfreeAmount(installments, 10.001), CashfreeAmountError);
});
