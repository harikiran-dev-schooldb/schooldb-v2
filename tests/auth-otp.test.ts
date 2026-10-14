import assert from "node:assert/strict";
import test from "node:test";

import {
  emailHash,
  normalizeLoginEmail,
  phoneHash,
} from "../src/features/auth/otp-identifiers.ts";

test("normalizes registered login email addresses", () => {
  assert.equal(
    normalizeLoginEmail("  Parent.Name+child@Example.COM "),
    "parent.name+child@example.com",
  );
});

test("rejects malformed login email addresses", () => {
  assert.equal(normalizeLoginEmail("parent@example"), null);
  assert.equal(normalizeLoginEmail("parent @example.com"), null);
  assert.equal(normalizeLoginEmail(""), null);
});

test("keeps email and mobile OTP challenge keys separate", () => {
  assert.notEqual(
    emailHash("school-1", "parent@example.com"),
    phoneHash("school-1", "parent@example.com"),
  );
});
