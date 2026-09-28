import assert from "node:assert/strict";
import test from "node:test";

import { findInstallmentSequenceViolation } from "../src/features/fee-payments/installment-sequence.ts";

const installments = [
  {
    id: "q1",
    name: "Quarter 1",
    studentFeeId: "tuition",
    sequence: 1,
    payableAmount: 8400,
    paidAmount: 0,
    status: "PENDING",
  },
  {
    id: "q2",
    name: "Quarter 2",
    studentFeeId: "tuition",
    sequence: 2,
    payableAmount: 8400,
    paidAmount: 0,
    status: "PENDING",
  },
  {
    id: "annual",
    name: "Annual",
    studentFeeId: "abacus",
    sequence: 1,
    payableAmount: 600,
    paidAmount: 0,
    status: "PENDING",
  },
];

test("blocks a later installment while an earlier installment is unpaid", () => {
  assert.deepEqual(
    findInstallmentSequenceViolation(installments, [
      { studentFeeInstallmentId: "q2", amount: 1 },
    ]),
    {
      installmentName: "Quarter 2",
      blockingInstallmentName: "Quarter 1",
    },
  );
});

test("allows a later installment when the same payment clears the earlier one", () => {
  assert.equal(
    findInstallmentSequenceViolation(installments, [
      { studentFeeInstallmentId: "q1", amount: 8400 },
      { studentFeeInstallmentId: "q2", amount: 1 },
    ]),
    null,
  );
});

test("still blocks the later installment when the earlier payment is partial", () => {
  assert.deepEqual(
    findInstallmentSequenceViolation(installments, [
      { studentFeeInstallmentId: "q1", amount: 100 },
      { studentFeeInstallmentId: "q2", amount: 1 },
    ]),
    {
      installmentName: "Quarter 2",
      blockingInstallmentName: "Quarter 1",
    },
  );
});

test("does not mix installment order between different assigned fee plans", () => {
  assert.equal(
    findInstallmentSequenceViolation(installments, [
      { studentFeeInstallmentId: "annual", amount: 1 },
    ]),
    null,
  );
});

test("treats waived earlier installments as cleared", () => {
  assert.equal(
    findInstallmentSequenceViolation(
      [{ ...installments[0], status: "WAIVED" }, installments[1]],
      [{ studentFeeInstallmentId: "q2", amount: 1 }],
    ),
    null,
  );
});
