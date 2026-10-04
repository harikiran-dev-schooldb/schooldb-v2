import assert from "node:assert/strict";
import test from "node:test";

import { calculateRteWaiver } from "../src/features/student-fees/rte-fee-policy.ts";

test("waives the full remaining fee for an RTE student", () => {
  assert.equal(calculateRteWaiver(10_000, 500, { isRte: true }), 9_500);
});

test("does not add an RTE waiver for a non-RTE student", () => {
  assert.equal(calculateRteWaiver(10_000, 500, { isRte: false }), 0);
});
