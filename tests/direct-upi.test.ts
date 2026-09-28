import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDirectUpiUri,
  isValidUpiId,
  isValidUpiReference,
  normalizeUpiReference,
} from "../src/features/online-payments/direct-upi.ts";

test("validates UPI IDs", () => {
  assert.equal(isValidUpiId("school@bank"), true);
  assert.equal(isValidUpiId("school.office-1@okhdfcbank"), true);
  assert.equal(isValidUpiId("not-a-upi-id"), false);
});

test("builds an encoded direct UPI payment URI", () => {
  const uri = buildDirectUpiUri({
    upiId: "school@bank",
    payeeName: "Kotak Salesian School",
    amount: 8500,
    note: "School fee - 16734",
  });
  const parsed = new URL(uri);

  assert.equal(parsed.protocol, "upi:");
  assert.equal(parsed.searchParams.get("pa"), "school@bank");
  assert.equal(parsed.searchParams.get("pn"), "Kotak Salesian School");
  assert.equal(parsed.searchParams.get("am"), "8500.00");
  assert.equal(parsed.searchParams.get("cu"), "INR");
  assert.equal(parsed.searchParams.get("tn"), "School fee - 16734");
});

test("rejects non-positive amounts", () => {
  assert.throws(() =>
    buildDirectUpiUri({
      upiId: "school@bank",
      payeeName: "School",
      amount: 0,
      note: "Fee",
    }),
  );
});

test("normalizes and validates UPI references", () => {
  assert.equal(normalizeUpiReference(" 4265 1234 5678 "), "426512345678");
  assert.equal(isValidUpiReference("426512345678"), true);
  assert.equal(isValidUpiReference("T260929ABC123"), true);
  assert.equal(isValidUpiReference("bad ref!"), false);
});
