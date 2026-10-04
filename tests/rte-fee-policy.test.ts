import assert from "node:assert/strict";
import test from "node:test";

import { isRteFeeExempt } from "../src/features/student-fees/rte-fee-policy.ts";

test("exempts students explicitly marked as RTE from fee assignment", () => {
  assert.equal(isRteFeeExempt({ isRte: true, category: "GENERAL" }), true);
});

test("keeps legacy RTE-category students fee exempt", () => {
  assert.equal(isRteFeeExempt({ isRte: false, category: "RTE" }), true);
});

test("allows fee assignment for non-RTE students", () => {
  assert.equal(isRteFeeExempt({ isRte: false, category: null }), false);
  assert.equal(isRteFeeExempt({ isRte: false, category: "SC" }), false);
});
