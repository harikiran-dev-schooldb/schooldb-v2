import assert from "node:assert/strict";
import test from "node:test";

import {
  allocateCashfreeAmount,
  cashfreeAllocationExceedsBalance,
  CashfreeAmountError,
} from "../src/features/online-payments/cashfree-allocation.ts";
import { cashfreeStaffOrderSchema } from "../src/features/online-payments/schemas/cashfree-order.schema.ts";

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

test("accepts a partial allocation during settlement", () => {
  assert.equal(cashfreeAllocationExceedsBalance(12300, 1), false);
  assert.equal(cashfreeAllocationExceedsBalance(1, 1), false);
});

test("requires review only when an allocation exceeds the current balance", () => {
  assert.equal(cashfreeAllocationExceedsBalance(0.5, 1), true);
});

const staffOrder = {
  schoolSlug: "kotak",
  studentId: "student-1",
  installmentIds: ["term-1"],
  idempotencyKey: "e924a78f-1b97-47ce-a9cc-02a3a1856487",
};

test("keeps the staff order API compatible with clients that omit amount", () => {
  assert.equal(cashfreeStaffOrderSchema.safeParse(staffOrder).success, true);
});

test("accepts a custom staff Cashfree amount", () => {
  assert.equal(
    cashfreeStaffOrderSchema.safeParse({ ...staffOrder, amount: 1250 }).success,
    true,
  );
});

test("accepts explicit staff installment allocations", () => {
  assert.equal(
    cashfreeStaffOrderSchema.safeParse({
      ...staffOrder,
      amount: 750,
      allocations: [{ installmentId: "term-1", amount: 750 }],
    }).success,
    true,
  );
});

test("rejects allocations that do not match the selected installments or total", () => {
  assert.equal(
    cashfreeStaffOrderSchema.safeParse({
      ...staffOrder,
      amount: 750,
      allocations: [{ installmentId: "term-2", amount: 750 }],
    }).success,
    false,
  );
  assert.equal(
    cashfreeStaffOrderSchema.safeParse({
      ...staffOrder,
      amount: 750,
      allocations: [{ installmentId: "term-1", amount: 500 }],
    }).success,
    false,
  );
});
