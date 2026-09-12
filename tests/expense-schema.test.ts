import assert from "node:assert/strict";
import test from "node:test";

import { expenseInputSchema, voidExpenseSchema } from "../src/features/expenses/schema.ts";

const validExpense = {
  category: "UTILITIES",
  description: "Electricity bill",
  vendor: "Power company",
  amount: "12500.50",
  expenseDate: "2026-09-11",
  paymentMode: "BANK_TRANSFER",
  referenceNo: "UTR-123",
  remarks: "August bill",
};

test("accepts a complete expense and converts its amount", () => {
  const result = expenseInputSchema.parse(validExpense);
  assert.equal(result.amount, 12500.5);
  assert.equal(result.category, "UTILITIES");
});

test("rejects invalid amounts and impossible dates", () => {
  assert.equal(expenseInputSchema.safeParse({ ...validExpense, amount: "-5" }).success, false);
  assert.equal(expenseInputSchema.safeParse({ ...validExpense, expenseDate: "2026-02-31" }).success, false);
});

test("requires a meaningful reason before voiding", () => {
  assert.equal(voidExpenseSchema.safeParse({ reason: "" }).success, false);
  assert.equal(voidExpenseSchema.safeParse({ reason: "Duplicate entry" }).success, true);
});
