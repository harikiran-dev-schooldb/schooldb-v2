import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFirebasePrivateKey } from "../src/lib/firebase-admin.ts";

const pem = "-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----";

test("normalizes an escaped Firebase private key", () => {
  assert.equal(normalizeFirebasePrivateKey(pem.replaceAll("\n", "\\n")), pem);
});

test("normalizes a quoted JSON private-key value", () => {
  assert.equal(normalizeFirebasePrivateKey(JSON.stringify(pem)), pem);
});

test("extracts the private key from a service-account JSON object", () => {
  assert.equal(normalizeFirebasePrivateKey(JSON.stringify({ private_key: pem })), pem);
});

test("normalizes a copied private_key JSON property", () => {
  assert.equal(normalizeFirebasePrivateKey(`"private_key": ${JSON.stringify(pem)},`), pem);
});

test("rejects a value without PEM markers", () => {
  assert.equal(normalizeFirebasePrivateKey("not-a-private-key"), undefined);
});
