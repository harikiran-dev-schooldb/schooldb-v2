import assert from "node:assert/strict";
import test from "node:test";

import { normalizeApnsPrivateKey } from "../src/lib/apns.ts";

test("normalizes APNs private keys stored with escaped newlines", () => {
  const raw = "-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----";
  assert.equal(
    normalizeApnsPrivateKey(raw),
    "-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----",
  );
});

test("rejects malformed APNs private keys", () => {
  assert.equal(normalizeApnsPrivateKey("not-a-key"), undefined);
  assert.equal(normalizeApnsPrivateKey(undefined), undefined);
});
