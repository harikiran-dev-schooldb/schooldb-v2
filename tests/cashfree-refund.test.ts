import assert from "node:assert/strict";
import test from "node:test";

import {
  cashfreeRefundPath,
  cashfreeRefundPayload,
} from "../src/features/online-payments/cashfree-refund-contract.ts";

test("builds the Cashfree refund endpoint with an encoded order id", () => {
  assert.equal(
    cashfreeRefundPath("ORDER/001"),
    "/orders/ORDER%2F001/refunds",
  );
});

test("builds the Cashfree standard refund payload", () => {
  assert.deepEqual(
    cashfreeRefundPayload({
      refundId: "REF-001",
      amount: 750,
      note: "Duplicate collection",
    }),
    {
      refund_id: "REF-001",
      refund_amount: 750,
      refund_note: "Duplicate collection",
      refund_speed: "STANDARD",
    },
  );
});
