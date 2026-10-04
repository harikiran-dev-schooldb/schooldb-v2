import assert from "node:assert/strict";
import test from "node:test";

import { isRteFeeExempt } from "../src/features/student-fees/rte-fee-policy.ts";

test("exempts students explicitly marked as RTE from fee assignment", () => {
  assert.equal(isRteFeeExempt({ isRte: true }), true);
});

test("allows fee assignment for non-RTE students", () => {
  assert.equal(isRteFeeExempt({ isRte: false }), false);
});
