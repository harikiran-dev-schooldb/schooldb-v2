import assert from "node:assert/strict";
import test from "node:test";

import {
  isRetryableTransactionError,
  withTransactionRetry,
} from "../src/lib/transaction-retry.ts";

test("retries Prisma serialization conflicts", async () => {
  let attempts = 0;
  const result = await withTransactionRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw { code: "P2034" };
    return "committed";
  });

  assert.equal(result, "committed");
  assert.equal(attempts, 3);
});

test("does not retry unrelated transaction errors", async () => {
  let attempts = 0;
  await assert.rejects(
    withTransactionRetry(async () => {
      attempts += 1;
      throw { code: "P2002" };
    }),
  );

  assert.equal(attempts, 1);
  assert.equal(isRetryableTransactionError({ code: "P2034" }), true);
});
