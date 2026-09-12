import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyCashfreeWebhookSignature } from "../src/features/online-payments/cashfree-signature.ts";

test("accepts a Cashfree signature created from timestamp plus the exact raw body", () => {
  const rawBody = '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"SDB-1"}}}';
  const timestamp = "1789098000000";
  const secretKey = "sandbox-secret";
  const signature = createHmac("sha256", secretKey)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");

  assert.equal(
    verifyCashfreeWebhookSignature({ rawBody, timestamp, signature, secretKey }),
    true,
  );
});

test("rejects a valid signature when the webhook body has been changed", () => {
  const rawBody = '{"type":"PAYMENT_FAILED_WEBHOOK"}';
  const timestamp = "1789098000000";
  const secretKey = "sandbox-secret";
  const signature = createHmac("sha256", secretKey)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");

  assert.equal(
    verifyCashfreeWebhookSignature({
      rawBody: `${rawBody} `,
      timestamp,
      signature,
      secretKey,
    }),
    false,
  );
});
